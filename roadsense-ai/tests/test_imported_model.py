"""
test_imported_model.py — Unit tests for imported pretrained model (sensor_rf.joblib).

Tests:
1. Model inspection metadata (RandomForest, 100 trees, 68 features, classes [0, 1]).
2. Dataset schema compatibility diagnostics.
3. 17-metric single-channel feature extraction.
4. 68-feature vector construction and ordering.
5. Signal adapter for 1-axis vertical suspension data.
6. Execution and validation of the prediction pipeline.
"""

import numpy as np
import pandas as pd
import pytest

from src.imported_model import (
    is_imported_model_present,
    inspect_imported_model,
    check_compatibility,
    extract_channel_features,
    extract_imported_features,
    adapt_vertical_signal_to_imported_schema,
    predict_imported,
)


def test_imported_model_presence_and_inspection():
    assert is_imported_model_present(), "sensor_rf.joblib must be present in models/"
    info = inspect_imported_model()

    assert info["status"] == "LOADED"
    assert info["model_class"] == "RandomForestClassifier"
    assert info["n_estimators"] == 100
    assert info["n_features_in"] == 68
    assert len(info["feature_names"]) == 68
    assert info["classes"] == [0, 1]
    assert info["file_size_mb"] > 6.0


def test_schema_compatibility_with_dataset():
    dataset_cols = [
        "run_id", "timestamp_ms", "hazard_type", "vehicle_speed_kmh",
        "baseline_clearance_mm", "dynamic_ground_clearance_mm",
        "chassis_accel_z_g", "wheel_displacement_mm",
        "suspension_deflection_mm", "pitch_rate_deg_s",
        "roll_rate_deg_s", "tire_normal_force_n",
    ]
    diag = check_compatibility(dataset_cols)

    assert diag["compatible_raw"] is False
    assert diag["compatible_with_adapter"] is True
    assert diag["has_triaxial_channels"] is False
    assert len(diag["missing_axes"]) == 2  # Missing accel_x and accel_y
    assert len(diag["reasons"]) >= 2


def test_extract_channel_features():
    sig = np.random.normal(0, 1, 100)
    feats = extract_channel_features("test_ch", sig, dt=0.01)

    assert len(feats) == 17
    assert "test_ch_mean" in feats
    assert "test_ch_rms" in feats
    assert "test_ch_kurtosis" in feats
    assert "test_ch_skewness" in feats
    assert "test_ch_zcr" in feats
    assert "test_ch_jerk_mean" in feats
    assert "test_ch_spectral_entropy" in feats
    assert isinstance(feats["test_ch_rms"], float)


def test_extract_imported_features_exact_68_schema():
    x = np.random.normal(0, 0.1, 100)
    y = np.random.normal(0, 0.1, 100)
    z = np.random.normal(1.0, 0.1, 100)

    df_feats = extract_imported_features(x, y, z, dt=0.01)

    assert isinstance(df_feats, pd.DataFrame)
    assert df_feats.shape == (1, 68)

    info = inspect_imported_model()
    expected = info["feature_names"]
    assert list(df_feats.columns) == expected


def test_adapt_vertical_signal_to_imported_schema():
    z = np.random.normal(1.0, 0.2, 100)
    pitch = np.ones(100) * 2.0
    roll = np.ones(100) * -1.5

    df_adapted = adapt_vertical_signal_to_imported_schema(z, pitch, roll, dt=0.01)

    assert df_adapted.shape == (1, 68)
    assert not df_adapted.isnull().values.any()


def test_predict_imported_pipeline():
    x = np.random.normal(0, 0.05, 100)
    y = np.random.normal(0, 0.05, 100)
    z = np.random.normal(1.0, 0.05, 100)

    df_feats = extract_imported_features(x, y, z, dt=0.01)
    res = predict_imported(df_feats)

    assert "predicted_class" in res
    assert res["predicted_class"] in [0, 1]
    assert "confidence" in res
    assert 0.0 <= res["confidence"] <= 1.0
    assert len(res["probabilities"]) == 2
    assert abs(sum(res["probabilities"]) - 1.0) < 1e-3
