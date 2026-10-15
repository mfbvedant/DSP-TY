"""
tests/test_input_analyzer.py — Comprehensive Unit & Integration Tests
for the RoadSense AI Input Analyzer Pipeline.
"""

import io
import math
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.input_analyzer import (
    parse_raw_input,
    detect_signal_channels,
    analyze_sampling,
    run_dsp_analysis,
    run_ml_inference,
    formulate_pothole_decision,
    analyze_road_data,
    CONFIDENCE_THRESHOLD,
)


@pytest.fixture
def sample_dataset_df():
    data_path = Path(__file__).resolve().parent.parent / "data" / "SampleDataOfSuspension(First1000).csv"
    if data_path.exists():
        return pd.read_csv(data_path)
    # Synthetic fallback for isolated environments
    np.random.seed(42)
    n = 100
    return pd.DataFrame({
        "timestamp_ms": np.arange(0, n * 10, 10),
        "chassis_accel_z_g": np.random.randn(n) * 0.1,
        "run_id": ["RUN_001"] * n,
        "hazard_type": ["POTHOLE"] * n,
    })


# ------------------------------------------------------------------ #
# 1. Parsing & Input Validation Tests                                #
# ------------------------------------------------------------------ #

def test_parse_csv_text_with_header():
    csv_text = "timestamp_ms,accel_z\n0,0.01\n10,0.02\n20,-0.03\n30,0.04\n40,0.05\n50,0.06\n60,-0.02\n70,0.01\n80,0.03\n90,-0.01"
    df, summary, warnings = parse_raw_input(csv_text, filename="input.csv")
    assert len(df) == 10
    assert summary["has_header"] is True
    assert "timestamp_ms" in df.columns
    assert "accel_z" in df.columns
    assert summary["source_type"] == "file_upload"


def test_parse_pasted_raw_numbers_without_header():
    raw_nums = "\n".join([str(0.01 * i) for i in range(15)])
    df, summary, warnings = parse_raw_input(raw_nums)
    assert len(df) == 15
    assert summary["has_header"] is False
    assert summary["source_type"] == "pasted_text"
    assert "col_0" in df.columns


def test_parse_comma_separated_single_line():
    single_line = "0.01, 0.05, -0.02, 0.03, 0.08, -0.04, 0.02, 0.06, -0.01, 0.04, 0.02"
    df, summary, warnings = parse_raw_input(single_line)
    assert len(df) == 11
    assert "col_0" in df.columns


def test_parse_tab_separated_data():
    tsv_text = "time\tacceleration\n0\t0.05\n10\t0.08\n20\t-0.03\n30\t0.02\n40\t0.06\n50\t-0.01\n60\t0.04\n70\t0.02\n80\t-0.05\n90\t0.01"
    df, summary, warnings = parse_raw_input(tsv_text)
    assert len(df) == 10
    assert "time" in df.columns
    assert "acceleration" in df.columns


def test_empty_input_rejected():
    with pytest.raises(ValueError, match="completely empty"):
        parse_raw_input("   \n\n   ")


def test_insufficient_samples_rejected():
    short_input = "0.1\n0.2\n0.3"
    with pytest.raises(ValueError, match="Insufficient samples"):
        parse_raw_input(short_input)


# ------------------------------------------------------------------ #
# 2. Channel & Timestamp Detection Tests                             #
# ------------------------------------------------------------------ #

def test_detect_channels_standard_names():
    df = pd.DataFrame({
        "timestamp_ms": [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
        "chassis_accel_z_g": [0.01, 0.02, -0.01, 0.03, 0.05, -0.02, 0.01, 0.04, -0.03, 0.02],
        "vehicle_speed_kmh": [40] * 10,
    })
    time_col, accel_col, details, warnings = detect_signal_channels(df)
    assert time_col == "timestamp_ms"
    assert accel_col == "chassis_accel_z_g"


def test_detect_channels_alternative_names():
    df = pd.DataFrame({
        "time_s": [0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09],
        "vertical_accel": [0.1, -0.2, 0.3, -0.1, 0.05, 0.12, -0.04, 0.08, 0.15, -0.1],
    })
    time_col, accel_col, details, warnings = detect_signal_channels(df)
    assert time_col == "time_s"
    assert accel_col == "vertical_accel"


# ------------------------------------------------------------------ #
# 3. Sampling Frequency Determination Tests                          #
# ------------------------------------------------------------------ #

def test_sampling_analysis_from_milliseconds():
    # 10 ms interval = 100 Hz
    df = pd.DataFrame({"timestamp_ms": np.arange(0, 100, 10)})
    info, warnings = analyze_sampling(df, "timestamp_ms")
    assert info["has_timestamps"] is True
    assert info["fs_hz"] == 100.0
    assert info["is_uniform"] is True
    assert info["nyquist_hz"] == 50.0


def test_sampling_analysis_from_seconds():
    # 0.02 s interval = 50 Hz
    df = pd.DataFrame({"time_s": np.arange(0.0, 1.0, 0.02)})
    info, warnings = analyze_sampling(df, "time_s")
    assert info["has_timestamps"] is True
    assert info["fs_hz"] == 50.0
    assert info["is_uniform"] is True


def test_sampling_analysis_unsorted_timestamps():
    # Out of order timestamps
    raw_ts = [0, 30, 10, 20, 50, 40, 70, 60, 90, 80]
    df = pd.DataFrame({"time_ms": raw_ts})
    info, warnings = analyze_sampling(df, "time_ms")
    assert info["fs_hz"] == 100.0
    assert any("chronological" in w.lower() for w in warnings)


def test_sampling_analysis_with_duplicates():
    # Duplicates in timestamps
    raw_ts = [0, 10, 10, 20, 30, 40, 50, 60, 70, 80]
    df = pd.DataFrame({"time_ms": raw_ts})
    info, warnings = analyze_sampling(df, "time_ms")
    assert info["fs_hz"] == 100.0
    assert any("duplicate" in w.lower() for w in warnings)


def test_sampling_analysis_without_timestamps_never_invents_fs():
    df = pd.DataFrame({"accel": np.random.randn(20)})
    info, warnings = analyze_sampling(df, time_col=None, assumed_fs=None)
    assert info["has_timestamps"] is False
    assert info["fs_hz"] is None
    assert "unknown" in info["fs_method"].lower()


def test_sampling_analysis_with_explicit_assumed_rate():
    df = pd.DataFrame({"accel": np.random.randn(20)})
    info, warnings = analyze_sampling(df, time_col=None, assumed_fs=200.0)
    assert info["has_timestamps"] is False
    assert info["fs_hz"] == 200.0
    assert info["nyquist_hz"] == 100.0


# ------------------------------------------------------------------ #
# 4. DSP Processing & Metrics Tests                                  #
# ------------------------------------------------------------------ #

def test_dsp_metrics_calculation():
    # Known signal with DC offset: sinusoid + 2.0 g DC
    t = np.linspace(0, 1.0, 100, endpoint=False)
    raw = 2.0 + np.sin(2 * np.pi * 5.0 * t)  # 5 Hz sinusoid with +2.0 DC
    preprocessing, dsp_metrics, warnings = run_dsp_analysis(raw, fs=100.0)

    # DC offset should be close to 2.0
    assert abs(preprocessing["dc_offset_removed"] - 2.0) < 0.05
    # Detrended RMS of unit sine wave is 1/sqrt(2) approx 0.707
    assert abs(dsp_metrics["rms"] - 0.707) < 0.05
    # FFT dominant frequency should be 5.0 Hz
    assert dsp_metrics["fft_available"] is True
    assert abs(dsp_metrics["dominant_freq_hz"] - 5.0) < 1.0


# ------------------------------------------------------------------ #
# 5. Full Pipeline & Equivalence Tests                               #
# ------------------------------------------------------------------ #

def test_csv_upload_vs_pasted_data_equivalence(sample_dataset_df):
    pothole_slice = sample_dataset_df[sample_dataset_df["run_id"] == "RUN_001"][
        ["timestamp_ms", "chassis_accel_z_g"]
    ].head(50)

    csv_text = pothole_slice.to_csv(index=False)
    csv_bytes = csv_text.encode("utf-8")

    # Upload method
    res_upload = analyze_road_data(csv_bytes, filename="run_001_pothole.csv")
    # Paste method
    res_paste = analyze_road_data(csv_text, filename=None)

    assert res_upload["success"] is True
    assert res_paste["success"] is True

    # Check numerical equivalence
    assert res_upload["sampling_info"]["fs_hz"] == res_paste["sampling_info"]["fs_hz"]
    assert res_upload["dsp_metrics"]["rms"] == res_paste["dsp_metrics"]["rms"]
    assert res_upload["dsp_metrics"]["peak"] == res_paste["dsp_metrics"]["peak"]
    assert res_upload["prediction"]["predicted_class"] == res_paste["prediction"]["predicted_class"]
    assert res_upload["pothole_decision"]["verdict"] == res_paste["pothole_decision"]["verdict"]


def test_pothole_vs_smooth_classification(sample_dataset_df):
    pothole_slice = sample_dataset_df[sample_dataset_df["run_id"] == "RUN_001"][
        ["timestamp_ms", "chassis_accel_z_g"]
    ].head(50)
    smooth_slice = sample_dataset_df[sample_dataset_df["run_id"] == "RUN_003"][
        ["timestamp_ms", "chassis_accel_z_g"]
    ].head(50)

    res_pothole = analyze_road_data(pothole_slice.to_csv(index=False))
    res_smooth = analyze_road_data(smooth_slice.to_csv(index=False))

    assert res_pothole["success"] is True
    assert res_smooth["success"] is True

    # Pothole should be detected
    assert res_pothole["pothole_decision"]["verdict"] == "Pothole detected"
    assert res_pothole["prediction"]["predicted_class"] == "POTHOLE"

    # Smooth highway should report No pothole detected
    assert res_smooth["pothole_decision"]["verdict"] == "No pothole detected"
    assert res_smooth["prediction"]["predicted_class"] == "SMOOTH_HIGHWAY"


def test_unknown_sampling_frequency_reports_unable_to_analyse():
    # Only numbers without timestamps and no assumed fs
    raw_nums = "\n".join([str(x) for x in np.random.randn(40) * 0.05])
    res = analyze_road_data(raw_nums)

    assert res["success"] is True
    assert res["sampling_info"]["fs_hz"] is None
    assert res["prediction"] is None
    assert res["pothole_decision"]["verdict"] == "Unable to analyse"
    assert "sampling frequency is unknown" in res["pothole_decision"]["summary"].lower()


def test_low_confidence_uncertain_decision():
    # Artificially test formulate_pothole_decision with low confidence
    mock_prediction = {
        "available": True,
        "predicted_class": "POTHOLE",
        "confidence": 0.35,  # Below 0.50 threshold
        "class_probabilities": {"POTHOLE": 0.35, "SPEED_BUMP": 0.30, "SMOOTH_HIGHWAY": 0.20, "EVASIVE_SWERVE": 0.15},
    }
    dsp_metrics = {"peak": 0.4, "crest_factor": 2.1}
    decision = formulate_pothole_decision(mock_prediction, dsp_metrics, fs_hz=100.0)

    assert decision["verdict"] == "Uncertain — further inspection recommended"
    assert decision["verdict_code"] == "UNCERTAIN"
    assert decision["verdict_severity"] == "warning"
