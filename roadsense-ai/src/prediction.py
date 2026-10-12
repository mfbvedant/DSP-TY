"""
prediction.py — Predict road condition for a new signal window.

Loads the saved model bundle and returns the predicted class
and (optionally) class probabilities.
"""

from typing import Dict, Optional, Tuple

import numpy as np

from .feature_extraction import extract_features
from .model_training import load_model


def predict_window(
    window: np.ndarray,
    fs: float,
    model_name: str = "best_model",
) -> Dict:
    """Classify a single acceleration window.

    Parameters
    ----------
    window : np.ndarray
        1-D acceleration array.
    fs : float
        Sampling frequency (Hz).
    model_name : str
        Saved model filename (without extension).

    Returns
    -------
    dict
        ``predicted_class``, ``confidence``, ``probabilities``,
        ``all_classes``.
    """
    bundle = load_model(model_name)
    clf = bundle["model"]
    feature_names = bundle["feature_names"]
    le = bundle["label_encoder"]
    scaler = bundle.get("scaler")

    # Extract features
    feats = extract_features(window, fs)
    X = np.array([[feats.get(fn, 0.0) for fn in feature_names]])
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)

    if scaler is not None:
        X = scaler.transform(X)

    pred = clf.predict(X)[0]
    pred_label = le.inverse_transform([pred])[0]

    probas = None
    confidence = None
    if hasattr(clf, "predict_proba"):
        try:
            probas = clf.predict_proba(X)[0]
            confidence = float(np.max(probas))
        except Exception:
            pass

    return {
        "predicted_class": pred_label,
        "confidence": confidence,
        "probabilities": probas,
        "all_classes": list(le.classes_),
    }
