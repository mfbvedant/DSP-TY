"""
server.py — FastAPI Backend for RoadSense AI Cyber-Telemetry React Cockpit.

Connects the React / Vite frontend directly to the working DSP & ML Python modules:
- src.data_loader
- src.preprocessing
- src.filters
- src.fft_analysis
- src.feature_extraction
- src.model_training
- src.prediction
- src.evaluation
"""

from pathlib import Path
from typing import Dict, List, Optional, Union

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from src.input_analyzer import analyze_road_data

from src.data_loader import (
    load_csv, validate_columns, inspect_dataset, get_sampling_frequency,
)
from src.preprocessing import (
    segment_by_run, prepare_run_signal, create_windows,
    remove_baseline, get_available_accel_columns,
)
from src.filters import (
    design_fir, apply_fir,
    design_iir_butterworth, apply_iir,
    iir_coefficients_ba,
)
from src.fft_analysis import (
    compute_fft, dominant_frequency, spectral_energy,
    spectral_centroid, spectral_spread, frequency_resolution,
)
from src.feature_extraction import (
    build_feature_table, extract_features, FEATURE_DESCRIPTIONS,
)
from src.model_training import (
    run_full_pipeline, load_model, MODELS_DIR, OUTPUTS_DIR,
)
from src.prediction import predict_window
from src.evaluation import save_evaluation_report, save_classification_reports
from src.imported_model import (
    is_imported_model_present, inspect_imported_model,
    check_compatibility, adapt_vertical_signal_to_imported_schema,
    predict_imported,
)

app = FastAPI(title="RoadSense AI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load and cache dataset once on startup
try:
    DF_DATA = load_csv()
    REPORT_DATA = inspect_dataset(DF_DATA)
    FS_NOMINAL = get_sampling_frequency(DF_DATA)
    RUNS_DATA = segment_by_run(DF_DATA)
except Exception as e:
    DF_DATA = None
    REPORT_DATA = {}
    FS_NOMINAL = 100.0
    RUNS_DATA = {}
    print(f"Warning loading data: {e}")


# ------------------------------------------------------------------ #
# Pydantic Request Models                                            #
# ------------------------------------------------------------------ #
class FilterRequest(BaseModel):
    run_id: str
    filter_family: str = "FIR"  # "FIR" or "IIR"
    filter_type: str = "lowpass"  # "lowpass", "highpass", "bandpass"
    cutoff: Union[float, List[float]] = 12.0
    order: int = 51
    channel: str = "chassis_accel_z_g"

class FFTRequest(BaseModel):
    run_id: str
    window_idx: int = 0
    window_duration_s: float = 0.5
    window_function: str = "hann"
    channel: str = "chassis_accel_z_g"

class PredictRequest(BaseModel):
    run_id: str
    window_idx: int = 0
    window_duration_s: float = 0.5
    channel: str = "chassis_accel_z_g"

class RetrainRequest(BaseModel):
    window_duration_s: float = 0.5
    overlap: float = 0.5


# ------------------------------------------------------------------ #
# API Endpoints                                                      #
# ------------------------------------------------------------------ #
@app.get("/api/status")
def get_status():
    model_loaded = False
    try:
        _ = load_model()
        model_loaded = True
    except Exception:
        pass

    return {
        "dataset_loaded": DF_DATA is not None,
        "total_samples": int(REPORT_DATA.get("n_rows", 0)),
        "sampling_frequency_hz": FS_NOMINAL,
        "nyquist_frequency_hz": FS_NOMINAL / 2.0,
        "simulation_runs": list(RUNS_DATA.keys()),
        "hazard_classes": sorted(DF_DATA["hazard_type"].unique().tolist()) if DF_DATA is not None else [],
        "model_loaded": model_loaded,
        "imported_model_present": is_imported_model_present(),
        "available_channels": get_available_accel_columns(DF_DATA) if DF_DATA is not None else [],
    }

@app.get("/api/runs")
def get_runs():
    results = []
    for rid, rdf in RUNS_DATA.items():
        hazard = rdf["hazard_type"].iloc[0]
        samples = len(rdf)
        duration_s = round(samples / FS_NOMINAL, 2)
        results.append({
            "run_id": rid,
            "hazard_type": hazard,
            "samples": samples,
            "duration_s": duration_s,
        })
    return results

@app.get("/api/signal")
def get_signal(
    run_id: str,
    channel: str = "chassis_accel_z_g",
    window_idx: Optional[int] = None,
    window_duration_s: float = 0.5,
):
    if run_id not in RUNS_DATA:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found.")

    rdf = RUNS_DATA[run_id]
    t, a, r_fs = prepare_run_signal(rdf, accel_col=channel)

    if window_idx is not None:
        win_size = max(10, int(r_fs * window_duration_s))
        wins = create_windows(a, win_size, overlap=0.0)
        if window_idx < 0 or window_idx >= len(wins):
            raise HTTPException(status_code=400, detail="Window index out of bounds.")
        w_data = wins[window_idx]
        t_start = (window_idx * win_size) / r_fs
        w_time = (np.arange(len(w_data)) / r_fs) + t_start

        rms = float(np.sqrt(np.mean(w_data ** 2)))
        peak = float(np.max(np.abs(w_data)))
        crest = peak / rms if rms > 0 else 0.0

        return {
            "run_id": run_id,
            "hazard_type": rdf["hazard_type"].iloc[0],
            "window_idx": window_idx,
            "total_windows": len(wins),
            "time_s": [round(x, 4) for x in w_time.tolist()],
            "accel_g": [round(x, 4) for x in w_data.tolist()],
            "metrics": {
                "rms": round(rms, 4),
                "peak": round(peak, 4),
                "crest_factor": round(crest, 2),
                "p2p": round(float(np.max(w_data) - np.min(w_data)), 4),
                "std": round(float(np.std(w_data)), 4),
            }
        }

    return {
        "run_id": run_id,
        "hazard_type": rdf["hazard_type"].iloc[0],
        "time_s": [round(x, 4) for x in t.tolist()],
        "accel_g": [round(x, 4) for x in a.tolist()],
        "total_samples": len(a),
    }

@app.post("/api/filter")
def run_filter(req: FilterRequest):
    if req.run_id not in RUNS_DATA:
        raise HTTPException(status_code=404, detail="Run not found")

    rdf = RUNS_DATA[req.run_id]
    t, a, r_fs = prepare_run_signal(rdf, accel_col=req.channel)

    try:
        from scipy.signal import freqz, sosfreqz
        if req.filter_family.upper() == "FIR":
            b = design_fir(r_fs, req.cutoff, req.filter_type, req.order)
            a_denom = [1.0]
            filt_sig = apply_fir(a, b)
            w, h = freqz(b, a_denom, worN=512, fs=r_fs)
        else:
            sos = design_iir_butterworth(r_fs, req.cutoff, req.filter_type, req.order)
            b, a_denom = iir_coefficients_ba(r_fs, req.cutoff, req.filter_type, req.order)
            filt_sig = apply_iir(a, sos)
            w, h = sosfreqz(sos, worN=512, fs=r_fs)

        mag_db = 20 * np.log10(np.maximum(np.abs(h), 1e-5))
        phase_deg = np.unwrap(np.angle(h)) * 180 / np.pi

        rms_raw = float(np.sqrt(np.mean(a ** 2)))
        rms_filt = float(np.sqrt(np.mean(filt_sig ** 2)))
        atten_pct = ((rms_raw - rms_filt) / rms_raw * 100) if rms_raw > 0 else 0.0

        return {
            "time_s": [round(x, 4) for x in t.tolist()],
            "raw_accel_g": [round(x, 4) for x in a.tolist()],
            "filtered_accel_g": [round(x, 4) for x in filt_sig.tolist()],
            "freq_hz": [round(x, 2) for x in w.tolist()],
            "magnitude_db": [round(x, 2) for x in mag_db.tolist()],
            "phase_deg": [round(x, 2) for x in phase_deg.tolist()],
            "metrics": {
                "rms_raw": round(rms_raw, 4),
                "rms_filtered": round(rms_filt, 4),
                "attenuation_pct": round(atten_pct, 1),
                "peak_raw": round(float(np.max(np.abs(a))), 4),
                "peak_filtered": round(float(np.max(np.abs(filt_sig))), 4),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/fft")
def run_fft(req: FFTRequest):
    if req.run_id not in RUNS_DATA:
        raise HTTPException(status_code=404, detail="Run not found")

    rdf = RUNS_DATA[req.run_id]
    t, a, r_fs = prepare_run_signal(rdf, accel_col=req.channel)
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds")

    w_data = wins[req.window_idx]
    freqs, mag = compute_fft(w_data, r_fs, window=req.window_function)
    dom_f = dominant_frequency(freqs, mag)
    s_centroid = spectral_centroid(freqs, mag)
    s_spread = spectral_spread(freqs, mag, centroid=s_centroid)
    s_energy = spectral_energy(mag)
    df_res = frequency_resolution(r_fs, len(w_data))

    return {
        "freqs_hz": [round(x, 2) for x in freqs.tolist()],
        "magnitude": [round(x, 5) for x in mag.tolist()],
        "dominant_freq_hz": round(dom_f, 2),
        "spectral_centroid_hz": round(s_centroid, 2),
        "spectral_spread_hz": round(s_spread, 2),
        "spectral_energy": round(s_energy, 5),
        "frequency_resolution_hz": round(df_res, 3),
        "window_function": req.window_function,
    }

@app.get("/api/spectral-classes")
def get_spectral_classes():
    class_spectra = {}
    for r_key, r_df in RUNS_DATA.items():
        ht = r_df["hazard_type"].iloc[0]
        if ht not in class_spectra:
            _, a_tmp, fs_tmp = prepare_run_signal(r_df)
            wins_tmp = create_windows(a_tmp, int(fs_tmp * 0.5), overlap=0.0)
            if wins_tmp:
                f_tmp, m_tmp = compute_fft(wins_tmp[0], fs_tmp, window="hann")
                class_spectra[ht] = {
                    "freqs": [round(x, 2) for x in f_tmp.tolist()],
                    "magnitude": [round(x, 5) for x in m_tmp.tolist()],
                }
    return class_spectra

@app.post("/api/predict")
def predict_road_condition(req: PredictRequest):
    if req.run_id not in RUNS_DATA:
        raise HTTPException(status_code=404, detail="Run not found")

    rdf = RUNS_DATA[req.run_id]
    t, a, r_fs = prepare_run_signal(rdf, accel_col=req.channel)
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds")

    w_data = wins[req.window_idx]
    pred_res = predict_window(w_data, r_fs)

    rms = float(np.sqrt(np.mean(w_data ** 2)))
    peak = float(np.max(np.abs(w_data)))
    crest = peak / rms if rms > 0 else 0.0

    return {
        "predicted_class": pred_res["predicted_class"],
        "confidence": round(pred_res["confidence"], 4) if pred_res["confidence"] else None,
        "all_classes": pred_res["all_classes"],
        "probabilities": [round(p, 4) for p in pred_res["probabilities"]] if pred_res["probabilities"] is not None else None,
        "ground_truth": rdf["hazard_type"].iloc[0],
        "metrics": {
            "rms": round(rms, 4),
            "peak": round(peak, 4),
            "crest_factor": round(crest, 2),
            "p2p": round(float(np.max(w_data) - np.min(w_data)), 4),
            "std": round(float(np.std(w_data)), 4),
        }
    }

@app.post("/api/analyze")
async def analyze_road(request: Request):
    """Universal Road Condition Analysis Endpoint.

    Accepts pasted raw text/CSV (JSON body) or uploaded files (multipart/form-data)
    and executes validation, sampling determination, DSP processing, feature extraction,
    and genuine machine-learning inference.
    """
    content_type = request.headers.get("content-type", "")
    content = None
    filename = None
    assumed_fs = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            content = await uploaded_file.read()
            filename = getattr(uploaded_file, "filename", "uploaded_file.csv")
        else:
            pasted = form.get("data")
            if pasted:
                content = str(pasted)
                filename = form.get("filename") or "pasted_data.txt"

        fs_val = form.get("assumed_fs")
        if fs_val:
            try:
                assumed_fs = float(fs_val)
            except ValueError:
                pass
    else:
        # JSON body
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON or form payload.")
        content = body.get("data")
        filename = body.get("filename", "pasted_data.txt")
        assumed_fs = body.get("assumed_fs")
        if assumed_fs is not None:
            try:
                assumed_fs = float(assumed_fs)
            except ValueError:
                assumed_fs = None

    if not content:
        raise HTTPException(
            status_code=400,
            detail="No vibration data received. Please provide a file or pasted text.",
        )

    try:
        result = analyze_road_data(content, filename=filename, assumed_fs=assumed_fs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")

# ------------------------------------------------------------------ #
# User-Provided Signal Endpoints (Operate on OverviewPage input)     #
# ------------------------------------------------------------------ #

class UserSignalFilterRequest(BaseModel):
    signal: List[float]
    fs: float
    filter_family: str = "FIR"
    filter_type: str = "lowpass"
    cutoff: Union[float, List[float]] = 12.0
    order: int = 51

class UserSignalFFTRequest(BaseModel):
    signal: List[float]
    fs: float
    window_idx: int = 0
    window_duration_s: float = 0.5
    window_function: str = "hann"

class UserSignalWindowRequest(BaseModel):
    signal: List[float]
    fs: float
    window_idx: int = 0
    window_duration_s: float = 0.5

class UserSignalPredictRequest(BaseModel):
    signal: List[float]
    fs: float
    window_idx: int = 0
    window_duration_s: float = 0.5


@app.post("/api/user-signal/filter")
def user_signal_filter(req: UserSignalFilterRequest):
    """Apply FIR/IIR filter to user-provided signal array."""
    a = np.array(req.signal, dtype=np.float64)
    a = a - np.mean(a)  # DC offset removal
    r_fs = req.fs
    t = np.arange(len(a)) / r_fs

    try:
        from scipy.signal import freqz, sosfreqz
        if req.filter_family.upper() == "FIR":
            b = design_fir(r_fs, req.cutoff, req.filter_type, req.order)
            a_denom = [1.0]
            filt_sig = apply_fir(a, b)
            w, h = freqz(b, a_denom, worN=512, fs=r_fs)
        else:
            sos = design_iir_butterworth(r_fs, req.cutoff, req.filter_type, req.order)
            b_coeff, a_denom = iir_coefficients_ba(r_fs, req.cutoff, req.filter_type, req.order)
            filt_sig = apply_iir(a, sos)
            w, h = sosfreqz(sos, worN=512, fs=r_fs)

        mag_db = 20 * np.log10(np.maximum(np.abs(h), 1e-5))
        phase_deg = np.unwrap(np.angle(h)) * 180 / np.pi

        rms_raw = float(np.sqrt(np.mean(a ** 2)))
        rms_filt = float(np.sqrt(np.mean(filt_sig ** 2)))
        atten_pct = ((rms_raw - rms_filt) / rms_raw * 100) if rms_raw > 0 else 0.0

        return {
            "time_s": [round(x, 4) for x in t.tolist()],
            "raw_accel_g": [round(x, 4) for x in a.tolist()],
            "filtered_accel_g": [round(x, 4) for x in filt_sig.tolist()],
            "freq_hz": [round(x, 2) for x in w.tolist()],
            "magnitude_db": [round(x, 2) for x in mag_db.tolist()],
            "phase_deg": [round(x, 2) for x in phase_deg.tolist()],
            "metrics": {
                "rms_raw": round(rms_raw, 4),
                "rms_filtered": round(rms_filt, 4),
                "attenuation_pct": round(atten_pct, 1),
                "peak_raw": round(float(np.max(np.abs(a))), 4),
                "peak_filtered": round(float(np.max(np.abs(filt_sig))), 4),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/user-signal/fft")
def user_signal_fft(req: UserSignalFFTRequest):
    """Compute FFT on user-provided signal array."""
    a = np.array(req.signal, dtype=np.float64)
    a = a - np.mean(a)  # DC offset removal
    r_fs = req.fs
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if not wins or req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds for the provided signal length.")

    w_data = wins[req.window_idx]
    freqs, mag = compute_fft(w_data, r_fs, window=req.window_function)
    dom_f = dominant_frequency(freqs, mag)
    s_centroid = spectral_centroid(freqs, mag)
    s_spread = spectral_spread(freqs, mag, centroid=s_centroid)
    s_energy = spectral_energy(mag)
    df_res = frequency_resolution(r_fs, len(w_data))

    return {
        "freqs_hz": [round(x, 2) for x in freqs.tolist()],
        "magnitude": [round(x, 5) for x in mag.tolist()],
        "dominant_freq_hz": round(dom_f, 2),
        "spectral_centroid_hz": round(s_centroid, 2),
        "spectral_spread_hz": round(s_spread, 2),
        "spectral_energy": round(s_energy, 5),
        "frequency_resolution_hz": round(df_res, 3),
        "window_function": req.window_function,
        "total_windows": len(wins),
    }


@app.post("/api/user-signal/window")
def user_signal_window(req: UserSignalWindowRequest):
    """Get a windowed segment from user-provided signal array."""
    a = np.array(req.signal, dtype=np.float64)
    a = a - np.mean(a)  # DC offset removal
    r_fs = req.fs
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if not wins or req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds for the provided signal length.")

    w_data = wins[req.window_idx]
    t_start = (req.window_idx * win_size) / r_fs
    w_time = (np.arange(len(w_data)) / r_fs) + t_start

    rms = float(np.sqrt(np.mean(w_data ** 2)))
    peak = float(np.max(np.abs(w_data)))
    crest = peak / rms if rms > 0 else 0.0

    return {
        "window_idx": req.window_idx,
        "total_windows": len(wins),
        "time_s": [round(x, 4) for x in w_time.tolist()],
        "accel_g": [round(x, 4) for x in w_data.tolist()],
        "metrics": {
            "rms": round(rms, 4),
            "peak": round(peak, 4),
            "crest_factor": round(crest, 2),
            "p2p": round(float(np.max(w_data) - np.min(w_data)), 4),
            "std": round(float(np.std(w_data)), 4),
        }
    }


@app.post("/api/user-signal/predict")
def user_signal_predict(req: UserSignalPredictRequest):
    """Predict road condition from user-provided signal array."""
    a = np.array(req.signal, dtype=np.float64)
    a = a - np.mean(a)  # DC offset removal
    r_fs = req.fs
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if not wins or req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds for the provided signal length.")

    w_data = wins[req.window_idx]
    pred_res = predict_window(w_data, r_fs)

    rms = float(np.sqrt(np.mean(w_data ** 2)))
    peak = float(np.max(np.abs(w_data)))
    crest = peak / rms if rms > 0 else 0.0

    return {
        "predicted_class": pred_res["predicted_class"],
        "confidence": round(pred_res["confidence"], 4) if pred_res["confidence"] else None,
        "all_classes": pred_res["all_classes"],
        "probabilities": [round(p, 4) for p in pred_res["probabilities"]] if pred_res["probabilities"] is not None else None,
        "ground_truth": "USER_INPUT",
        "total_windows": len(wins),
        "metrics": {
            "rms": round(rms, 4),
            "peak": round(peak, 4),
            "crest_factor": round(crest, 2),
            "p2p": round(float(np.max(w_data) - np.min(w_data)), 4),
            "std": round(float(np.std(w_data)), 4),
        }
    }


@app.get("/api/evaluation")
def get_evaluation():
    eval_csv = OUTPUTS_DIR / "evaluation_report.csv"
    cls_txt = OUTPUTS_DIR / "classification_reports.txt"

    metrics_list = []
    if eval_csv.exists():
        df_ev = pd.read_csv(eval_csv)
        metrics_list = df_ev.to_dict(orient="records")

    report_text = ""
    if cls_txt.exists():
        with open(cls_txt, "r") as f:
            report_text = f.read()

    return {
        "metrics": metrics_list,
        "classification_report": report_text,
    }

@app.post("/api/retrain")
def retrain_model(req: RetrainRequest):
    feat_tbl = build_feature_table(DF_DATA, window_duration_s=req.window_duration_s, overlap=req.overlap)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    feat_tbl.to_csv(OUTPUTS_DIR / "features.csv", index=False)
    results = run_full_pipeline(feat_tbl)
    save_evaluation_report(results)
    save_classification_reports(results)
    return {
        "success": True,
        "best_model": results["best_model_name"],
        "total_windows": len(feat_tbl),
    }

@app.get("/api/export/{export_type}")
def export_file(export_type: str, run_id: Optional[str] = None):
    if export_type == "features":
        p = OUTPUTS_DIR / "features.csv"
    elif export_type == "evaluation":
        p = OUTPUTS_DIR / "evaluation_report.csv"
    elif export_type == "signal" and run_id:
        if run_id in RUNS_DATA:
            t, a, _ = prepare_run_signal(RUNS_DATA[run_id])
            out_p = OUTPUTS_DIR / f"{run_id}_signal.csv"
            pd.DataFrame({"time_s": t, "accel_z_g": a}).to_csv(out_p, index=False)
            return FileResponse(out_p, filename=f"{run_id}_signal.csv", media_type="text/csv")
        raise HTTPException(status_code=404, detail="Run not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid export type")

    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(p, filename=p.name, media_type="text/csv")


# ------------------------------------------------------------------ #
# Imported Pretrained Model Endpoints                                #
# ------------------------------------------------------------------ #
@app.get("/api/imported-model/status")
def get_imported_model_status():
    metadata = inspect_imported_model()
    dataset_cols = DF_DATA.columns.tolist() if DF_DATA is not None else []
    compatibility = check_compatibility(dataset_cols)
    return {
        "present": is_imported_model_present(),
        "metadata": metadata,
        "compatibility": compatibility,
    }


@app.post("/api/imported-model/predict")
def predict_with_imported_model(req: PredictRequest):
    if not is_imported_model_present():
        raise HTTPException(status_code=404, detail="Imported model sensor_rf.joblib not found")

    if req.run_id not in RUNS_DATA:
        raise HTTPException(status_code=404, detail="Run not found")

    rdf = RUNS_DATA[req.run_id]
    t, a, r_fs = prepare_run_signal(rdf, accel_col=req.channel)
    win_size = max(10, int(r_fs * req.window_duration_s))
    wins = create_windows(a, win_size, overlap=0.0)

    if req.window_idx >= len(wins):
        raise HTTPException(status_code=400, detail="Window index out of bounds")

    w_data = wins[req.window_idx]
    start_idx = req.window_idx * win_size
    end_idx = min(len(rdf), start_idx + len(w_data))

    pitch_w = rdf["pitch_rate_deg_s"].iloc[start_idx:end_idx].values if "pitch_rate_deg_s" in rdf.columns else None
    roll_w = rdf["roll_rate_deg_s"].iloc[start_idx:end_idx].values if "roll_rate_deg_s" in rdf.columns else None

    df_feats = adapt_vertical_signal_to_imported_schema(w_data, pitch_rate=pitch_w, roll_rate=roll_w, dt=1.0 / r_fs)
    res = predict_imported(df_feats)
    res["run_id"] = req.run_id
    res["window_idx"] = req.window_idx
    res["ground_truth"] = rdf["hazard_type"].iloc[0]
    return res



# ------------------------------------------------------------------ #
# Mount Compiled React Frontend (Single Server Mode)                 #
# ------------------------------------------------------------------ #
FRONTEND_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

