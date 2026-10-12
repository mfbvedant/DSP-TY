"""Tests for feature extraction."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.feature_extraction import (
    time_domain_features, frequency_domain_features,
    extract_features, extract_features_from_run, build_feature_table,
)


FS = 100.0


def test_time_domain_features_basic():
    window = np.array([1.0, -1.0, 2.0, -2.0, 0.0])
    feats = time_domain_features(window)
    assert feats["mean"] == pytest.approx(0.0)
    assert feats["min"] == -2.0
    assert feats["max"] == 2.0
    assert feats["peak_to_peak"] == 4.0
    assert feats["peak_abs"] == 2.0
    assert feats["rms"] > 0


def test_time_domain_features_empty():
    feats = time_domain_features(np.array([]))
    assert feats["mean"] == 0.0
    assert feats["rms"] == 0.0


def test_rms_known_value():
    """RMS of constant signal should equal the absolute value."""
    sig = np.full(100, 3.0)
    feats = time_domain_features(sig)
    assert abs(feats["rms"] - 3.0) < 1e-10


def test_crest_factor():
    """Crest factor of a pure sinusoid = sqrt(2) ≈ 1.414."""
    t = np.arange(10000) / 10000.0
    sig = np.sin(2 * np.pi * t)
    feats = time_domain_features(sig)
    assert abs(feats["crest_factor"] - np.sqrt(2)) < 0.05


def test_frequency_domain_features():
    t = np.arange(200) / FS
    sig = np.sin(2 * np.pi * 10 * t)
    feats = frequency_domain_features(sig, FS)
    assert abs(feats["dominant_freq"] - 10.0) < 1.5
    assert feats["spectral_energy"] > 0
    assert feats["spectral_centroid"] > 0


def test_extract_features_combined():
    sig = np.random.randn(200)
    feats = extract_features(sig, FS)
    expected_keys = {
        "mean", "std", "variance", "rms", "min", "max",
        "peak_abs", "peak_to_peak", "crest_factor",
        "dominant_freq", "spectral_centroid", "spectral_energy",
        "spectral_spread", "low_band_energy", "mid_band_energy",
        "high_band_energy",
    }
    assert expected_keys.issubset(set(feats.keys()))


def test_extract_features_from_run():
    accel = np.random.randn(300)
    df = extract_features_from_run(accel, FS, window_size=100,
                                   overlap=0.5, label="TEST", run_id="R1")
    assert len(df) > 0
    assert "label" in df.columns
    assert "run_id" in df.columns
    assert (df["label"] == "TEST").all()


def test_build_feature_table():
    """Integration test with a small synthetic dataset."""
    np.random.seed(42)
    df = pd.DataFrame({
        "run_id": ["R1"] * 50 + ["R2"] * 50,
        "timestamp_ms": list(range(0, 500, 10)) + list(range(0, 500, 10)),
        "hazard_type": ["POTHOLE"] * 50 + ["SMOOTH_HIGHWAY"] * 50,
        "chassis_accel_z_g": np.random.randn(100) * 0.1,
    })
    feat_table = build_feature_table(df, window_duration_s=0.2, overlap=0.5)
    assert len(feat_table) > 0
    assert "label" in feat_table.columns


def test_features_no_nan():
    """No feature should be NaN for a valid signal."""
    sig = np.random.randn(200)
    feats = extract_features(sig, FS)
    for k, v in feats.items():
        assert np.isfinite(v), f"Feature '{k}' is not finite: {v}"
