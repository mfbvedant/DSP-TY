"""
input_analyzer.py — Automatic Data Validation, Parsing, DSP Analysis,
and Machine Learning Road Condition Inference.

Processes pasted text or uploaded files through a unified, reproducible pipeline:
1. Validation & Safe Parsing (CSV, TSV, space, newline formats)
2. Channel & Timestamp Auto-Detection
3. Rigorous Sampling Frequency Calculation (without fabrication)
4. Digital Signal Processing (time-domain stats, DC removal, FFT spectrum)
5. Model-Compatible Feature Extraction (16 DSP feature moments)
6. Genuine ML Inference & Honest Pothole Verdict
"""

import io
import math
import re
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

from . import fft_analysis
from .feature_extraction import extract_features, time_domain_features, FEATURE_DESCRIPTIONS
from .model_training import load_model, MODELS_DIR

# Security limits
MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_SAMPLES = 50_000
MIN_SAMPLES = 10
CONFIDENCE_THRESHOLD = 0.50  # 4-class random guessing is 0.25; 0.50 is conservative threshold

# Known candidate column patterns (case-insensitive regex)
TIME_PATTERNS = [
    r"^timestamp_?ms$",
    r"^timestamp_?s$",
    r"^timestamp$",
    r"^time_?ms$",
    r"^time_?s$",
    r"^time$",
    r"^t_?s$",
    r"^t$",
    r"^date_?time$",
]

ACCEL_PATTERNS = [
    r"^chassis_accel_z_g$",
    r"^accel_z_g$",
    r"^accel_z$",
    r"^acceleration_z$",
    r"^vertical_accel$",
    r"^acc_z$",
    r"^az$",
    r"^accel$",
    r"^acceleration$",
    r"^vibration$",
    r"^g_force$",
    r"^chassis_accel$",
]


def parse_raw_input(
    content: Union[str, bytes],
    filename: Optional[str] = None,
) -> Tuple[pd.DataFrame, dict, list]:
    """Safely parse pasted text or file contents into a pandas DataFrame.

    Supports CSV, TSV, space-separated, semicolon-separated, or single-column newline lists.
    """
    warnings = []
    summary = {
        "source_type": "file_upload" if filename else "pasted_text",
        "filename": filename or "pasted_data.txt",
        "file_size_bytes": 0,
        "total_samples": 0,
        "has_header": False,
        "detected_columns": [],
    }

    if isinstance(content, bytes):
        summary["file_size_bytes"] = len(content)
        if len(content) > MAX_RAW_SIZE_BYTES:
            raise ValueError(f"File size exceeds 10 MB limit ({len(content)} bytes).")
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = content.decode("latin-1")
            except Exception as e:
                raise ValueError(f"Unable to decode file encoding: {str(e)}")
    else:
        text = str(content)
        summary["file_size_bytes"] = len(text.encode("utf-8"))
        if len(text.encode("utf-8")) > MAX_RAW_SIZE_BYTES:
            raise ValueError("Pasted text exceeds 10 MB limit.")

    cleaned_text = text.strip()
    if not cleaned_text:
        raise ValueError("Input data is completely empty. Please paste or upload numerical vibration samples.")

    # Check for single-line comma/space-separated values: "0.1, 0.2, 0.3..."
    lines = [ln.strip() for ln in cleaned_text.splitlines() if ln.strip()]
    if len(lines) == 1 and ("," in lines[0] or " " in lines[0]):
        # Reformat single line into newline-separated numbers
        delimiter = "," if "," in lines[0] else None
        tokens = [t.strip() for t in lines[0].split(delimiter) if t.strip()]
        cleaned_text = "\n".join(tokens)
        lines = tokens

    # Attempt pandas parsing with automatic delimiter sniffer
    df = None
    first_line = lines[0]

    # Check if first line appears to be a header (contains non-numeric characters)
    first_tokens = re.split(r"[,;\t\s]+", first_line)
    has_alpha = any(re.search(r"[a-zA-Z_]", tok) for tok in first_tokens if tok)

    try:
        # Use pandas read_csv with flexible delimiter engine
        buffer = io.StringIO(cleaned_text)
        if has_alpha:
            summary["has_header"] = True
            # Read with header
            df = pd.read_csv(buffer, sep=None, engine="python")
        else:
            summary["has_header"] = False
            # Read without header, assign column names
            df = pd.read_csv(buffer, sep=None, engine="python", header=None)
            df.columns = [f"col_{i}" for i in range(df.shape[1])]
    except Exception as e:
        # Fallback: parse as single column of floats
        try:
            floats = []
            for idx, line in enumerate(lines):
                # Ignore non-numeric header line
                if idx == 0 and has_alpha:
                    continue
                val = float(line.strip().split(",")[0].split()[0])
                floats.append(val)
            df = pd.DataFrame({"col_0": floats})
            summary["has_header"] = has_alpha
        except Exception:
            raise ValueError(f"Could not parse numerical data structure: {str(e)}")

    if df is None or df.empty:
        raise ValueError("Parsed data contains no rows.")

    if len(df) > MAX_SAMPLES:
        warnings.append(f"Data was truncated from {len(df)} to {MAX_SAMPLES} samples for processing.")
        df = df.iloc[:MAX_SAMPLES]

    if len(df) < MIN_SAMPLES:
        raise ValueError(
            f"Insufficient samples: received {len(df)} samples, but at least {MIN_SAMPLES} are required for analysis."
        )

    # Strip column names whitespace
    df.columns = [str(c).strip() for c in df.columns]
    summary["detected_columns"] = df.columns.tolist()
    summary["total_samples"] = len(df)

    return df, summary, warnings


def detect_signal_channels(df: pd.DataFrame) -> Tuple[Optional[str], str, dict, list]:
    """Detect timestamp column and acceleration vibration channel deterministically."""
    warnings = []
    details = {}

    col_names = [str(c).strip() for c in df.columns]

    # 1. Identify Time Column
    time_col = None
    for pattern in TIME_PATTERNS:
        for col in col_names:
            if re.match(pattern, col, re.IGNORECASE):
                time_col = col
                break
        if time_col:
            break

    # If not matched by name, check if first column is strictly monotonic increasing integers/floats
    if time_col is None and len(col_names) > 1:
        first_col = col_names[0]
        col_series = pd.to_numeric(df[first_col], errors="coerce")
        if col_series.notnull().all() and (col_series.diff().dropna() > 0).all():
            # Looks like an explicit counter or timestamp
            time_col = first_col
            warnings.append(f"Column '{first_col}' auto-selected as timestamp based on monotonic series progression.")

    # 2. Identify Acceleration / Vibration Column
    accel_col = None
    for pattern in ACCEL_PATTERNS:
        for col in col_names:
            if col == time_col:
                continue
            if re.match(pattern, col, re.IGNORECASE):
                accel_col = col
                break
        if accel_col:
            break

    # If no named acceleration column matched, pick first numeric non-time column
    if accel_col is None:
        numeric_candidates = [
            c for c in col_names if c != time_col and pd.to_numeric(df[c], errors="coerce").notnull().sum() > len(df) * 0.8
        ]
        if not numeric_candidates:
            raise ValueError("No valid numeric vibration signal columns found in data.")
        accel_col = numeric_candidates[0]
        warnings.append(
            f"No standard vertical acceleration name matched. Automatically selected numeric channel '{accel_col}'."
        )

    details["time_column"] = time_col
    details["accel_column"] = accel_col
    details["total_columns"] = len(col_names)

    return time_col, accel_col, details, warnings


def analyze_sampling(
    df: pd.DataFrame,
    time_col: Optional[str],
    assumed_fs: Optional[float] = None,
) -> Tuple[dict, list]:
    """Rigorous sampling frequency determination. Never invents a rate without evidence."""
    warnings = []
    info = {
        "has_timestamps": False,
        "fs_hz": None,
        "fs_method": "No timestamps detected",
        "is_uniform": False,
        "interval_median_s": None,
        "interval_std_s": None,
        "irregularity_pct": 0.0,
        "duration_s": None,
        "nyquist_hz": None,
    }

    if time_col is not None and time_col in df.columns:
        ts_raw = pd.to_numeric(df[time_col], errors="coerce").dropna().values
        if len(ts_raw) < 2:
            warnings.append("Insufficient timestamp rows to calculate sampling interval.")
            return info, warnings

        info["has_timestamps"] = True

        # Check for duplicates or negative differences
        diffs = np.diff(ts_raw)
        has_negative = (diffs < 0).any()
        if has_negative:
            warnings.append("Timestamps were not in chronological order; sorted before interval calculation.")
            ts_raw = np.sort(ts_raw)
            diffs = np.diff(ts_raw)

        # Check duplicate timestamps
        zero_diffs = (diffs == 0).sum()
        if zero_diffs > 0:
            warnings.append(f"Detected {zero_diffs} duplicate timestamps in input series.")
            # Filter zero differences for interval estimation
            diffs = diffs[diffs > 0]
            if len(diffs) == 0:
                warnings.append("All timestamp intervals are zero; unable to calculate rate.")
                return info, warnings

        # Determine unit (seconds vs milliseconds vs microseconds)
        median_dt = float(np.median(diffs))
        col_lower = time_col.lower()

        if "ms" in col_lower:
            dt_seconds = diffs / 1000.0
            time_scale = 1000.0
            unit_name = "milliseconds"
        elif "_us" in col_lower:
            dt_seconds = diffs / 1_000_000.0
            time_scale = 1_000_000.0
            unit_name = "microseconds"
        elif "_s" in col_lower or col_lower in ["time_s", "t_s"]:
            dt_seconds = diffs
            time_scale = 1.0
            unit_name = "seconds"
        else:
            # Automatic heuristic by magnitude
            if median_dt >= 1.0 and median_dt <= 1000.0:
                # Typical sensor timestamps: e.g. 10 ms (100 Hz), 20 ms (50 Hz), 5 ms (200 Hz)
                dt_seconds = diffs / 1000.0
                time_scale = 1000.0
                unit_name = "inferred milliseconds (ms)"
            elif median_dt < 1.0:
                # Floating seconds: e.g. 0.01 s
                dt_seconds = diffs
                time_scale = 1.0
                unit_name = "inferred seconds (s)"
            else:
                # Larger epoch timestamp
                dt_seconds = diffs / 1000.0
                time_scale = 1000.0
                unit_name = "inferred millisecond epoch"

        median_dt_s = float(np.median(dt_seconds))
        if median_dt_s <= 0:
            warnings.append("Median timestamp delta is non-positive; cannot compute sampling frequency.")
            return info, warnings

        fs_calculated = round(1.0 / median_dt_s, 2)
        info["fs_hz"] = fs_calculated
        info["interval_median_s"] = round(median_dt_s, 6)
        info["nyquist_hz"] = round(fs_calculated / 2.0, 2)
        info["fs_method"] = (
            f"Calculated from median timestamp interval: dt = {median_dt:.3f} {unit_name} "
            f"({median_dt_s*1000:.2f} ms) -> fs = {fs_calculated} Hz"
        )

        total_duration = float((ts_raw[-1] - ts_raw[0]) / time_scale)
        info["duration_s"] = round(total_duration, 4)

        # Check uniformity
        mean_dt_s = float(np.mean(dt_seconds))
        std_dt_s = float(np.std(dt_seconds))
        info["interval_std_s"] = round(std_dt_s, 6)

        cv = std_dt_s / mean_dt_s if mean_dt_s > 0 else 0.0
        info["irregularity_pct"] = round(cv * 100.0, 2)
        if cv < 0.05:
            info["is_uniform"] = True
        else:
            info["is_uniform"] = False
            warnings.append(
                f"Sampling interval irregularity is {info['irregularity_pct']}%. "
                "Spectral leakage may occur during standard FFT decomposition."
            )

    elif assumed_fs is not None and assumed_fs > 0:
        info["fs_hz"] = float(assumed_fs)
        info["fs_method"] = f"User-specified nominal sampling rate: {assumed_fs} Hz"
        info["is_uniform"] = True
        info["interval_median_s"] = round(1.0 / assumed_fs, 6)
        info["nyquist_hz"] = round(assumed_fs / 2.0, 2)
        info["duration_s"] = round(len(df) / assumed_fs, 4)
        warnings.append(
            f"Timestamps absent. Analysis performed using user-specified sampling rate of {assumed_fs} Hz."
        )
    else:
        info["fs_hz"] = None
        info["fs_method"] = "Unknown — no timestamps found in input data and no assumed rate specified."
        warnings.append(
            "Sampling frequency is unknown. Time-domain statistics will be computed, "
            "but frequency-domain FFT and ML inference require a verified sampling rate."
        )

    return info, warnings


def run_dsp_analysis(
    accel_raw: np.ndarray,
    fs: Optional[float] = None,
) -> Tuple[dict, dict, list]:
    """Execute DSP analysis: baseline detrending, statistical moments, and FFT spectrum."""
    warnings = []
    preprocessing = {
        "operations": [],
        "dc_offset_removed": 0.0,
        "cleaned_samples_count": len(accel_raw),
    }

    # Clean signal: handle any NaNs by linear interpolation
    nan_mask = np.isnan(accel_raw)
    nan_count = int(nan_mask.sum())
    if nan_count > 0:
        pct = (nan_count / len(accel_raw)) * 100.0
        if pct > 10.0:
            raise ValueError(f"Excessive NaN values in vibration signal ({nan_count}/{len(accel_raw)} = {pct:.1f}%).")
        # Interpolate NaNs
        nans, x = np.isnan(accel_raw), lambda z: z.nonzero()[0]
        accel_clean = accel_raw.copy()
        accel_clean[nans] = np.interp(x(nans), x(~nans), accel_raw[~nans])
        preprocessing["operations"].append(f"Interpolated {nan_count} isolated NaN values ({pct:.2f}%).")
        warnings.append(f"Interpolated {nan_count} NaN values in acceleration stream.")
    else:
        accel_clean = accel_raw.copy()

    # Remove DC baseline offset
    dc_offset = float(np.mean(accel_clean))
    accel_detrended = accel_clean - dc_offset
    preprocessing["dc_offset_removed"] = round(dc_offset, 5)
    preprocessing["operations"].append(f"Detrended DC baseline offset of {dc_offset:.5f} g.")

    # Time-domain statistical metrics
    time_feats = time_domain_features(accel_detrended)
    dsp_metrics = {
        "mean": round(time_feats["mean"], 5),
        "std": round(time_feats["std"], 5),
        "variance": round(time_feats["variance"], 6),
        "rms": round(time_feats["rms"], 5),
        "peak": round(time_feats["peak_abs"], 5),
        "peak_to_peak": round(time_feats["peak_to_peak"], 5),
        "crest_factor": round(time_feats["crest_factor"], 2),
        "sample_count": len(accel_detrended),
        "duration_s": round(len(accel_detrended) / fs, 4) if fs else None,
        "fft_available": False,
        "dominant_freq_hz": None,
        "spectral_centroid_hz": None,
        "spectral_spread_hz": None,
        "spectral_energy": None,
        "frequency_resolution_hz": None,
        "waveform_downsampled": {},
        "fft_spectrum": {},
    }

    # Generate downsampled waveform for smooth canvas rendering (max 500 points)
    max_pts = 500
    n = len(accel_detrended)
    if n > max_pts:
        step = int(math.ceil(n / max_pts))
        idx_sub = np.arange(0, n, step)
    else:
        idx_sub = np.arange(n)

    if fs is not None and fs > 0:
        time_axis = [round(float(i / fs), 4) for i in idx_sub]
    else:
        time_axis = [int(i) for i in idx_sub]

    dsp_metrics["waveform_downsampled"] = {
        "time": time_axis,
        "accel": [round(float(accel_detrended[i]), 5) for i in idx_sub],
    }

    # FFT analysis if sampling rate is available
    if fs is not None and fs > 0:
        try:
            freqs, mag = fft_analysis.compute_fft(accel_detrended, fs, window="hann")
            dsp_metrics["fft_available"] = True
            dsp_metrics["dominant_freq_hz"] = round(float(fft_analysis.dominant_frequency(freqs, mag)), 2)
            sc = float(fft_analysis.spectral_centroid(freqs, mag))
            dsp_metrics["spectral_centroid_hz"] = round(sc, 2)
            dsp_metrics["spectral_spread_hz"] = round(float(fft_analysis.spectral_spread(freqs, mag, centroid=sc)), 2)
            dsp_metrics["spectral_energy"] = round(float(fft_analysis.spectral_energy(mag)), 4)
            dsp_metrics["frequency_resolution_hz"] = round(float(fs / len(accel_detrended)), 3)

            # Cap FFT spectrum points for response payload (max 150 points)
            max_fft_pts = 150
            if len(freqs) > max_fft_pts:
                fft_step = int(math.ceil(len(freqs) / max_fft_pts))
                f_sub = freqs[::fft_step]
                m_sub = mag[::fft_step]
            else:
                f_sub = freqs
                m_sub = mag

            dsp_metrics["fft_spectrum"] = {
                "freqs_hz": [round(float(f), 2) for f in f_sub],
                "magnitude": [round(float(m), 5) for m in m_sub],
            }
            preprocessing["operations"].append("Computed single-sided FFT with Hann window tapering.")
        except Exception as e:
            warnings.append(f"FFT computation failed: {str(e)}")

    return preprocessing, dsp_metrics, warnings


def run_ml_inference(
    accel_clean: np.ndarray,
    fs: Optional[float],
) -> Tuple[Optional[dict], dict, list]:
    """Execute model inference using the real trained classifier artifact."""
    warnings = []
    features_summary = {
        "extracted_count": 0,
        "feature_names": [],
        "feature_values": {},
        "feature_schema_valid": False,
    }

    if fs is None or fs <= 0:
        warnings.append("Cannot perform model inference: sampling frequency is unknown.")
        return None, features_summary, warnings

    # Load model bundle
    try:
        bundle = load_model("best_model")
    except Exception as e:
        warnings.append(f"Failed to load trained model bundle: {str(e)}")
        return None, features_summary, warnings

    clf = bundle["model"]
    feature_names = bundle["feature_names"]
    le = bundle["label_encoder"]
    scaler = bundle.get("scaler")

    # The model was trained on 0.50 s windows (50 samples at 100 Hz).
    # If the user data is longer than 50 samples, we extract features from the central/maximum window
    # or the window with maximum crest factor/RMS to capture the peak transient shock.
    win_len = max(10, int(fs * 0.50))
    if len(accel_clean) >= win_len:
        # If signal is longer, find the 0.5s segment with maximum energy / crest factor
        n_windows = len(accel_clean) - win_len + 1
        if n_windows > 1:
            step = max(1, win_len // 2)
            best_win = accel_clean[:win_len]
            max_shock = -1.0
            for start_idx in range(0, len(accel_clean) - win_len + 1, step):
                w_candidate = accel_clean[start_idx : start_idx + win_len]
                shock_score = float(np.max(np.abs(w_candidate)))
                if shock_score > max_shock:
                    max_shock = shock_score
                    best_win = w_candidate
            eval_window = best_win
        else:
            eval_window = accel_clean[:win_len]
    else:
        # Signal shorter than 0.5s: zero-pad or analyze available
        eval_window = accel_clean

    # Extract 16 DSP features
    raw_feats = extract_features(eval_window, fs)
    features_summary["extracted_count"] = len(raw_feats)
    features_summary["feature_names"] = list(raw_feats.keys())
    features_summary["feature_values"] = {k: round(float(v), 5) for k, v in raw_feats.items()}

    # Validate feature schema against model expectations
    missing_feats = [fn for fn in feature_names if fn not in raw_feats]
    if missing_feats:
        warnings.append(f"Missing expected model features: {missing_feats}")
        features_summary["feature_schema_valid"] = False
        return None, features_summary, warnings

    features_summary["feature_schema_valid"] = True

    # Assemble vector and scale
    X = np.array([[raw_feats.get(fn, 0.0) for fn in feature_names]])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    if scaler is not None:
        X = scaler.transform(X)

    # Genuine inference
    pred_idx = int(clf.predict(X)[0])
    pred_label = str(le.inverse_transform([pred_idx])[0])

    confidence = None
    class_probabilities = {}
    if hasattr(clf, "predict_proba"):
        try:
            probas = clf.predict_proba(X)[0]
            confidence = float(np.max(probas))
            for c_name, p_val in zip(le.classes_, probas):
                class_probabilities[str(c_name)] = round(float(p_val), 4)
        except Exception:
            pass

    prediction_result = {
        "available": True,
        "predicted_class": pred_label,
        "confidence": round(confidence, 4) if confidence is not None else None,
        "class_probabilities": class_probabilities,
        "all_classes": [str(c) for c in le.classes_],
        "inference_status": "SUCCESS",
        "ground_truth": None,  # Strictly None for uploaded/pasted data
    }

    return prediction_result, features_summary, warnings


def formulate_pothole_decision(
    prediction: Optional[dict],
    dsp_metrics: dict,
    fs_hz: Optional[float],
) -> dict:
    """Evaluate honest pothole decision based on model inference and confidence threshold."""
    decision = {
        "verdict": "Unable to analyse",
        "verdict_code": "UNABLE_TO_ANALYSE",
        "verdict_severity": "error",
        "primary_class": "N/A",
        "confidence_pct": None,
        "confidence_threshold_used": CONFIDENCE_THRESHOLD,
        "summary": "Model inference could not be executed.",
        "recommendation": "Provide valid accelerometer data with timestamps or an explicit sampling rate.",
    }

    if prediction is None or not prediction.get("available"):
        if fs_hz is None:
            decision["summary"] = "Sampling frequency is unknown. Spectral features and ML inference require a verified sampling rate."
            decision["recommendation"] = "Include timestamps in your file or specify the acquisition rate (e.g., 100 Hz)."
        else:
            decision["summary"] = "Feature extraction or model evaluation encountered an unexpected condition."
            decision["recommendation"] = "Verify that the input signal contains valid numeric vibration values."
        return decision

    predicted_cls = prediction["predicted_class"].upper()
    conf = prediction.get("confidence") or 0.0
    conf_pct = round(conf * 100.0, 1)

    decision["primary_class"] = predicted_cls
    decision["confidence_pct"] = conf_pct

    # Check uncertainty threshold
    if conf < CONFIDENCE_THRESHOLD:
        decision["verdict"] = "Uncertain — further inspection recommended"
        decision["verdict_code"] = "UNCERTAIN"
        decision["verdict_severity"] = "warning"
        decision["summary"] = (
            f"The model's highest class probability ({conf_pct}%) falls below the 50.0% confidence criterion. "
            "The vibration signature does not present a clear-cut pattern."
        )
        decision["recommendation"] = (
            "Inspect the raw vibration waveform and frequency spectrum in the DSP Laboratory, "
            "or acquire a longer signal window."
        )
        return decision

    # Confident classification
    if "POTHOLE" in predicted_cls:
        decision["verdict"] = "Pothole detected"
        decision["verdict_code"] = "POTHOLE_DETECTED"
        decision["verdict_severity"] = "hazard"
        decision["summary"] = (
            f"Validated Random Forest model identified a Pothole impact with {conf_pct}% confidence. "
            f"Peak acceleration was {dsp_metrics.get('peak', 0):.3f} g with crest factor {dsp_metrics.get('crest_factor', 0):.2f}."
        )
        decision["recommendation"] = (
            "Flag roadway coordinates for pavement maintenance. Inspect vehicle suspension and tire rim integrity."
        )
    else:
        decision["verdict"] = "No pothole detected"
        decision["verdict_code"] = "NO_POTHOLE"
        decision["verdict_severity"] = "nominal"
        label_clean = predicted_cls.replace("_", " ").title()
        decision["summary"] = (
            f"Model predicts '{label_clean}' with {conf_pct}% confidence. "
            "The vibration signature does not exhibit pothole shock characteristics."
        )
        decision["recommendation"] = "Surface meets nominal driving conditions for the identified road category."

    return decision


def analyze_road_data(
    content: Union[str, bytes],
    filename: Optional[str] = None,
    assumed_fs: Optional[float] = None,
) -> dict:
    """Top-level pipeline orchestrator matching the API response contract."""
    all_warnings = []
    processing_steps = []

    # Stage 1: Validation & Safe Parsing
    try:
        df, input_summary, parse_warnings = parse_raw_input(content, filename)
        all_warnings.extend(parse_warnings)
        processing_steps.append({
            "stage": "validation",
            "name": "Input Validation & Parsing",
            "status": "SUCCESS",
            "details": f"Parsed {input_summary['total_samples']} samples across {len(input_summary['detected_columns'])} columns.",
        })
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "errors": [str(e)],
            "warnings": all_warnings,
            "processing_steps": [{
                "stage": "validation",
                "name": "Input Validation & Parsing",
                "status": "FAILED",
                "details": str(e),
            }],
            "pothole_decision": {
                "verdict": "Unable to analyse",
                "verdict_code": "UNABLE_TO_ANALYSE",
                "verdict_severity": "error",
                "primary_class": "N/A",
                "confidence_pct": None,
                "summary": str(e),
                "recommendation": "Check the input format and provide numerical vibration data.",
            },
        }

    # Stage 2: Channel Identification & Signal Preparation
    try:
        time_col, accel_col, channel_details, ch_warnings = detect_signal_channels(df)
        all_warnings.extend(ch_warnings)
        input_summary["selected_channel"] = accel_col
        input_summary["has_timestamps"] = time_col is not None
        input_summary["time_column"] = time_col
        input_summary["channel_selection_reason"] = (
            f"Selected '{accel_col}' as primary vertical vibration channel."
        )

        accel_raw = pd.to_numeric(df[accel_col], errors="coerce").values
        processing_steps.append({
            "stage": "signal_preparation",
            "name": "Channel Identification",
            "status": "SUCCESS",
            "details": f"Target vibration channel: '{accel_col}'. Timestamp column: '{time_col or 'None'}'.",
        })
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "errors": [str(e)],
            "warnings": all_warnings,
            "processing_steps": processing_steps + [{
                "stage": "signal_preparation",
                "name": "Channel Identification",
                "status": "FAILED",
                "details": str(e),
            }],
            "pothole_decision": {
                "verdict": "Unable to analyse",
                "verdict_code": "UNABLE_TO_ANALYSE",
                "verdict_severity": "error",
                "summary": str(e),
                "recommendation": "Ensure data contains at least one numeric vibration column.",
            },
        }

    # Stage 3: Sampling Frequency Analysis
    sampling_info, samp_warnings = analyze_sampling(df, time_col, assumed_fs)
    all_warnings.extend(samp_warnings)
    processing_steps.append({
        "stage": "sampling_analysis",
        "name": "Sampling Rate Determination",
        "status": "SUCCESS" if sampling_info["fs_hz"] is not None else "WARNING",
        "details": sampling_info["fs_method"],
    })

    # Stage 4: DSP Processing
    try:
        preprocessing, dsp_metrics, dsp_warnings = run_dsp_analysis(accel_raw, sampling_info["fs_hz"])
        all_warnings.extend(dsp_warnings)
        processing_steps.append({
            "stage": "dsp_processing",
            "name": "Digital Signal Processing",
            "status": "SUCCESS",
            "details": f"RMS = {dsp_metrics['rms']:.3f} g, Peak = {dsp_metrics['peak']:.3f} g, Crest = {dsp_metrics['crest_factor']:.2f}.",
        })
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "errors": [str(e)],
            "warnings": all_warnings,
            "processing_steps": processing_steps + [{
                "stage": "dsp_processing",
                "name": "Digital Signal Processing",
                "status": "FAILED",
                "details": str(e),
            }],
            "pothole_decision": {
                "verdict": "Unable to analyse",
                "verdict_code": "UNABLE_TO_ANALYSE",
                "verdict_severity": "error",
                "summary": str(e),
                "recommendation": "Signal processing failed due to non-numeric or out-of-range values.",
            },
        }

    # Stage 5: Feature Extraction & ML Inference
    accel_detrended = accel_raw - preprocessing["dc_offset_removed"]
    prediction, features_summary, ml_warnings = run_ml_inference(accel_detrended, sampling_info["fs_hz"])
    all_warnings.extend(ml_warnings)

    if prediction is not None and prediction.get("available"):
        processing_steps.append({
            "stage": "ml_inference",
            "name": "Machine Learning Classification",
            "status": "SUCCESS",
            "details": f"Model predicted '{prediction['predicted_class']}' with {(prediction['confidence'] or 0)*100:.1f}% confidence.",
        })
    else:
        processing_steps.append({
            "stage": "ml_inference",
            "name": "Machine Learning Classification",
            "status": "WARNING" if sampling_info["fs_hz"] is None else "FAILED",
            "details": "Inference could not be executed (sampling rate unavailable or feature extraction failed).",
        })

    # Stage 6: Honest Pothole Decision
    pothole_decision = formulate_pothole_decision(prediction, dsp_metrics, sampling_info["fs_hz"])

    model_info = {
        "model_architecture": "RandomForestClassifier (100 estimators, balanced)",
        "model_artifact": "models/best_model.joblib",
        "features_expected": 16,
        "classes_supported": ["EVASIVE_SWERVE", "POTHOLE", "SMOOTH_HIGHWAY", "SPEED_BUMP"],
        "trained_on": "2-DOF Quarter-Car Mass-Spring-Damper Simulation Feature Vectors",
        "ground_truth_policy": "Never inferred from filename or labels. Purely model inference.",
    }

    return {
        "success": True,
        "input_summary": input_summary,
        "sampling_info": sampling_info,
        "preprocessing": preprocessing,
        "dsp_metrics": dsp_metrics,
        "features_summary": features_summary,
        "model_info": model_info,
        "prediction": prediction,
        "pothole_decision": pothole_decision,
        "warnings": all_warnings,
        "errors": [],
        "processing_steps": processing_steps,
    }
