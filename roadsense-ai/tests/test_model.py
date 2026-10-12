"""Tests for model training, evaluation, and inference."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.model_training import (
    prepare_data,
    split_by_group,
    train_random_forest,
    train_svm,
    evaluate_model,
    run_full_pipeline,
    save_model,
    load_model,
)
from src.prediction import predict_window


def _dummy_feature_df(n_samples: int = 40):
    np.random.seed(42)
    classes = ["smooth", "pothole", "rumble_strip", "rough"]
    rows = []
    for i in range(n_samples):
        cls = classes[i % len(classes)]
        run = f"run_{i // 10}"
        rows.append({
            "mean": np.random.randn() * 0.1,
            "std": np.random.rand() + 0.1,
            "rms": np.random.rand() + 0.1,
            "crest_factor": np.random.rand() * 3 + 1,
            "dominant_freq": np.random.choice([5.0, 12.0, 25.0]),
            "spectral_energy": np.random.rand() * 10,
            "spectral_centroid": np.random.rand() * 20 + 2,
            "low_band_energy": np.random.rand() * 3,
            "mid_band_energy": np.random.rand() * 3,
            "high_band_energy": np.random.rand() * 3,
            "label": cls,
            "run_id": run,
            "window_idx": i,
        })
    return pd.DataFrame(rows)


def test_prepare_data_shapes():
    df = _dummy_feature_df()
    X, y, groups, feat_cols, le = prepare_data(df)
    assert X.shape[0] == len(df)
    assert len(y) == len(df)
    assert len(groups) == len(df)
    assert "mean" in feat_cols
    assert "label" not in feat_cols
    assert len(le.classes_) == 4


def test_split_by_group():
    df = _dummy_feature_df()
    X, y, groups, _, _ = prepare_data(df)
    X_train, X_test, y_train, y_test = split_by_group(X, y, groups, test_size_ratio=0.25)
    assert len(X_train) + len(X_test) == len(X)
    assert len(X_train) > 0
    assert len(X_test) > 0


def test_train_rf_and_evaluate():
    df = _dummy_feature_df()
    X, y, groups, feat_cols, le = prepare_data(df)
    X_train, X_test, y_train, y_test = split_by_group(X, y, groups)
    rf = train_random_forest(X_train, y_train, n_estimators=10)
    metrics = evaluate_model(rf, X_test, y_test, list(le.classes_))
    assert "accuracy" in metrics
    assert "f1" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_train_svm_and_evaluate():
    df = _dummy_feature_df()
    X, y, groups, feat_cols, le = prepare_data(df)
    X_train, X_test, y_train, y_test = split_by_group(X, y, groups)
    svm, scaler = train_svm(X_train, y_train)
    metrics = evaluate_model(svm, X_test, y_test, list(le.classes_), scaler=scaler)
    assert "accuracy" in metrics
    assert "f1" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_run_full_pipeline_and_predict_window():
    df = _dummy_feature_df()
    results = run_full_pipeline(df)
    assert "RandomForest" in results
    assert "SVM" in results
    assert "best_model_name" in results

    # Test inference using saved bundle
    dummy_signal = np.random.randn(50)
    pred_res = predict_window(dummy_signal, fs=100.0)
    assert "predicted_class" in pred_res
    assert pred_res["predicted_class"] in results["label_names"]
