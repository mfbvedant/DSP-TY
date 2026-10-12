"""Tests for data loading and preprocessing."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

# Ensure project root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data_loader import load_csv, validate_columns, inspect_dataset, get_sampling_frequency
from src.preprocessing import (
    remove_baseline, create_windows, create_windows_with_indices,
    segment_by_run, prepare_run_signal,
)


@pytest.fixture
def sample_df():
    """Create a minimal synthetic DataFrame matching the schema."""
    return pd.DataFrame({
        "run_id": ["R1"] * 10 + ["R2"] * 10,
        "timestamp_ms": list(range(0, 100, 10)) + list(range(0, 100, 10)),
        "hazard_type": ["POTHOLE"] * 10 + ["SMOOTH_HIGHWAY"] * 10,
        "vehicle_speed_kmh": [30.0] * 20,
        "baseline_clearance_mm": [190.0] * 20,
        "dynamic_ground_clearance_mm": [190.0] * 20,
        "chassis_accel_z_g": np.random.randn(20) * 0.1,
        "wheel_displacement_mm": np.zeros(20),
        "suspension_deflection_mm": np.zeros(20),
        "pitch_rate_deg_s": np.zeros(20),
        "roll_rate_deg_s": np.zeros(20),
        "tire_normal_force_n": [4365.0] * 20,
    })


# ---- data_loader tests ----

def test_validate_columns_all_present(sample_df):
    result = validate_columns(sample_df)
    assert result["valid"] is True
    assert result["missing"] == []


def test_validate_columns_missing():
    df = pd.DataFrame({"a": [1], "b": [2]})
    result = validate_columns(df)
    assert result["valid"] is False
    assert len(result["missing"]) > 0


def test_inspect_dataset(sample_df):
    report = inspect_dataset(sample_df)
    assert report["n_rows"] == 20
    assert "POTHOLE" in report["class_distribution"]
    assert "SMOOTH_HIGHWAY" in report["class_distribution"]
    assert "R1" in report["run_ids"]


def test_get_sampling_frequency(sample_df):
    fs = get_sampling_frequency(sample_df)
    assert abs(fs - 100.0) < 1e-3  # 10 ms intervals → 100 Hz


# ---- preprocessing tests ----

def test_remove_baseline():
    sig = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    result = remove_baseline(sig)
    assert abs(np.mean(result)) < 1e-10


def test_create_windows_basic():
    sig = np.arange(100, dtype=float)
    windows = create_windows(sig, window_size=20, overlap=0.5)
    assert len(windows) == 9  # (100-20)/(20*0.5) + 1 = 9
    assert len(windows[0]) == 20


def test_create_windows_no_overlap():
    sig = np.arange(100, dtype=float)
    windows = create_windows(sig, window_size=25, overlap=0.0)
    assert len(windows) == 4  # 100 / 25 = 4


def test_create_windows_invalid():
    with pytest.raises(ValueError):
        create_windows(np.arange(10), window_size=0)
    with pytest.raises(ValueError):
        create_windows(np.arange(10), window_size=5, overlap=1.0)


def test_create_windows_with_indices():
    sig = np.arange(50, dtype=float)
    results = create_windows_with_indices(sig, 10, 0.5)
    assert len(results) > 0
    start, end, win = results[0]
    assert start == 0
    assert end == 10
    assert len(win) == 10


def test_segment_by_run(sample_df):
    runs = segment_by_run(sample_df)
    assert "R1" in runs
    assert "R2" in runs
    assert len(runs["R1"]) == 10


def test_prepare_run_signal(sample_df):
    runs = segment_by_run(sample_df)
    t, acc, fs = prepare_run_signal(runs["R1"])
    assert len(t) == 10
    assert len(acc) == 10
    assert abs(fs - 100.0) < 1e-3


def test_load_real_csv():
    """Smoke test: load the actual dataset."""
    try:
        df = load_csv()
        assert len(df) > 0
        report = validate_columns(df)
        assert report["valid"] is True
    except FileNotFoundError:
        pytest.skip("Dataset CSV not found in data/ directory.")
