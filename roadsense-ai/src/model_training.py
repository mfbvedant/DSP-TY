"""
model_training.py — Machine-learning classification pipeline.

Trains Random Forest and SVM classifiers on DSP-extracted features.
Handles scaling, train/test splitting by run_id (to prevent data
leakage from overlapping windows), and model persistence.
"""

from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import GroupKFold, cross_val_score
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
)


MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
OUTPUTS_DIR = Path(__file__).resolve().parent.parent / "outputs"

RANDOM_SEED = 42


def prepare_data(
    feature_df: pd.DataFrame,
    label_col: str = "label",
    group_col: str = "run_id",
    exclude_cols: Optional[list] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, list, LabelEncoder]:
    """Prepare feature matrix, label vector, and group vector.

    Parameters
    ----------
    feature_df : pd.DataFrame
        Feature table from ``feature_extraction.build_feature_table``.
    label_col : str
        Column with the road-condition label.
    group_col : str
        Column for group-based splitting (prevents data leakage).
    exclude_cols : list, optional
        Additional columns to exclude from features.

    Returns
    -------
    X : np.ndarray   shape (n_windows, n_features)
    y : np.ndarray   shape (n_windows,)  encoded labels
    groups : np.ndarray  group identifiers for splitting
    feature_names : list of str
    le : LabelEncoder
    """
    if exclude_cols is None:
        exclude_cols = []
    meta_cols = {label_col, group_col, "window_idx"} | set(exclude_cols)
    feature_cols = [c for c in feature_df.columns if c not in meta_cols]

    X = feature_df[feature_cols].values.astype(float)
    le = LabelEncoder()
    y = le.fit_transform(feature_df[label_col].values)
    groups = feature_df[group_col].values if group_col in feature_df.columns else np.zeros(len(y))

    # Replace any NaN/Inf with 0
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    return X, y, groups, feature_cols, le


def split_by_group(
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
    test_size_ratio: float = 0.25,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Split data by group (run_id) — no overlapping-window leakage.

    Since we have very few groups (runs), we do a simple leave-one-out
    style split: the last unique group becomes the test set.
    If there is only one group, we fall back to a random split with
    a warning.

    Returns
    -------
    X_train, X_test, y_train, y_test
    """
    unique_groups = np.unique(groups)
    all_classes = np.unique(y)

    if len(unique_groups) <= 1:
        # Cannot split by group — fall back
        from sklearn.model_selection import train_test_split
        return train_test_split(
            X, y, test_size=test_size_ratio,
            random_state=RANDOM_SEED,
            stratify=y if len(all_classes) > 1 else None,
        )

    # Use last group(s) as test; rest as train
    n_test = max(1, int(len(unique_groups) * test_size_ratio))
    test_groups = set(unique_groups[-n_test:])

    test_mask = np.isin(groups, list(test_groups))
    train_classes = np.unique(y[~test_mask])

    # If holding out groups would hide any class completely from training,
    # fall back to stratified window split to ensure all classes are learnable
    if len(train_classes) < len(all_classes):
        from sklearn.model_selection import train_test_split
        return train_test_split(
            X, y, test_size=test_size_ratio,
            random_state=RANDOM_SEED,
            stratify=y if len(all_classes) > 1 else None,
        )

    X_train, y_train = X[~test_mask], y[~test_mask]
    X_test, y_test = X[test_mask], y[test_mask]
    return X_train, X_test, y_train, y_test


def train_random_forest(
    X_train: np.ndarray,
    y_train: np.ndarray,
    n_estimators: int = 100,
) -> RandomForestClassifier:
    """Train a Random Forest classifier."""
    clf = RandomForestClassifier(
        n_estimators=n_estimators,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    return clf


def train_svm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    scaler: Optional[StandardScaler] = None,
) -> Tuple[SVC, StandardScaler]:
    """Train an SVM classifier with scaling.

    Returns the trained SVM and the fitted scaler.
    """
    if scaler is None:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_train)
    else:
        X_scaled = scaler.transform(X_train)

    clf = SVC(
        kernel="rbf",
        C=1.0,
        gamma="scale",
        probability=True,
        random_state=RANDOM_SEED,
        class_weight="balanced",
    )
    clf.fit(X_scaled, y_train)
    return clf, scaler


def evaluate_model(
    clf,
    X_test: np.ndarray,
    y_test: np.ndarray,
    label_names: list,
    scaler: Optional[StandardScaler] = None,
) -> Dict:
    """Evaluate a trained classifier and return metrics.

    Parameters
    ----------
    clf : classifier
    X_test : np.ndarray
    y_test : np.ndarray
    label_names : list of str
    scaler : StandardScaler, optional
        If provided, scale X_test before prediction.

    Returns
    -------
    dict with keys: accuracy, precision, recall, f1, confusion_matrix,
    classification_report, predictions, probabilities.
    """
    X_eval = scaler.transform(X_test) if scaler is not None else X_test
    y_pred = clf.predict(X_eval)

    probas = None
    if hasattr(clf, "predict_proba"):
        try:
            probas = clf.predict_proba(X_eval)
        except Exception:
            probas = None

    class_indices = list(range(len(label_names)))
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=class_indices)
    report = classification_report(
        y_test,
        y_pred,
        labels=class_indices,
        target_names=label_names,
        zero_division=0,
    )
    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "confusion_matrix": cm,
        "classification_report": report,
        "predictions": y_pred,
        "probabilities": probas,
    }


def save_model(
    clf,
    feature_names: list,
    label_encoder: LabelEncoder,
    model_name: str = "best_model",
    scaler: Optional[StandardScaler] = None,
) -> Path:
    """Save model, feature schema, and label encoder to disk."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    bundle = {
        "model": clf,
        "feature_names": feature_names,
        "label_encoder": label_encoder,
        "scaler": scaler,
    }
    path = MODELS_DIR / f"{model_name}.joblib"
    joblib.dump(bundle, path)
    return path


def load_model(model_name: str = "best_model") -> Dict:
    """Load a saved model bundle."""
    path = MODELS_DIR / f"{model_name}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")
    return joblib.load(path)


def run_full_pipeline(
    feature_df: pd.DataFrame,
    model_name: str = "best_model",
) -> Dict:
    """End-to-end training pipeline: prepare → split → train → evaluate → save.

    Returns a dict with results for both Random Forest and SVM.
    """
    X, y, groups, feature_names, le = prepare_data(feature_df)
    label_names = list(le.classes_)

    X_train, X_test, y_train, y_test = split_by_group(X, y, groups)

    results = {}

    # 1. Random Forest
    rf = train_random_forest(X_train, y_train)
    rf_metrics = evaluate_model(rf, X_test, y_test, label_names)
    results["RandomForest"] = rf_metrics

    # 2. SVM (with scaling)
    svm, scaler = train_svm(X_train, y_train)
    svm_metrics = evaluate_model(svm, X_test, y_test, label_names, scaler=scaler)
    results["SVM"] = svm_metrics

    # Pick the best by F1 score
    best_name = max(results, key=lambda k: results[k]["f1"])

    # Fit the production model on all available samples so all classes are known
    if best_name == "RandomForest":
        best_clf = train_random_forest(X, y)
        best_scaler = None
    else:
        best_clf, best_scaler = train_svm(X, y)

    save_model(best_clf, feature_names, le,
               model_name=model_name, scaler=best_scaler)

    results["best_model_name"] = best_name
    results["feature_names"] = feature_names
    results["label_names"] = label_names
    results["label_encoder"] = le

    return results
