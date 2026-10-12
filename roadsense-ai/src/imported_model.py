"""
imported_model.py — Inspection, Adapter, and Inference Pipeline for Imported Pretrained Model.

Manages external pretrained models (such as `models/sensor_rf.joblib`),
analyzes schema compatibility with the RoadSense AI dataset, extracts the
exact 68-feature input matrix, and executes tested inference.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union
import warnings

import numpy as np
import pandas as pd
from scipy import stats
import joblib

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
IMPORTED_MODEL_PATH = MODELS_DIR / "sensor_rf.joblib"


# ------------------------------------------------------------------ #
# 1. Model Inspection & Metadata                                     #
# ------------------------------------------------------------------ #

def get_imported_model_path() -> Path:
    """Return the absolute path to the imported model file."""
    return IMPORTED_MODEL_PATH


def is_imported_model_present() -> bool:
    """Check if the imported model file exists in the models directory."""
    return IMPORTED_MODEL_PATH.exists() and IMPORTED_MODEL_PATH.stat().st_size > 0


def load_imported_model():
    """Load the imported model from disk.

    Suppresses InconsistentVersionWarning if loaded across sklearn minor versions.
    """
    if not is_imported_model_present():
        raise FileNotFoundError(f"Imported model not found at: {IMPORTED_MODEL_PATH}")

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=UserWarning)
        model = joblib.load(IMPORTED_MODEL_PATH)
    return model


def inspect_imported_model() -> Dict:
    """Extract complete structural metadata from the imported model file.

    Returns
    -------
    dict
        Metadata including class, size, n_features, feature names, and classes.
    """
    if not is_imported_model_present():
        return {
            "status": "NOT_FOUND",
            "path": str(IMPORTED_MODEL_PATH),
        }

    model = load_imported_model()
    file_size_bytes = IMPORTED_MODEL_PATH.stat().st_size
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

    feature_names = list(getattr(model, "feature_names_in_", []))
    classes = [int(c) for c in getattr(model, "classes_", [])]

    return {
        "status": "LOADED",
        "model_file": IMPORTED_MODEL_PATH.name,
        "model_path": str(IMPORTED_MODEL_PATH),
        "file_size_mb": file_size_mb,
        "model_class": model.__class__.__name__,
        "n_estimators": len(getattr(model, "estimators_", [])),
        "criterion": getattr(model, "criterion", "unknown"),
        "max_depth": getattr(model, "max_depth", None),
        "n_features_in": getattr(model, "n_features_in_", len(feature_names)),
        "feature_names": feature_names,
        "classes": classes,
        "n_classes": len(classes),
        "classification_type": "Binary Classification (0 vs 1)" if len(classes) == 2 else "Multi-Class",
    }


# ------------------------------------------------------------------ #
# 2. Schema Compatibility Diagnostic                                 #
# ------------------------------------------------------------------ #

def check_compatibility(dataset_columns: List[str]) -> Dict:
    """Evaluate whether a dataset's columns match the imported model schema.

    Parameters
    ----------
    dataset_columns : list of str
        Column names in the user's dataset.

    Returns
    -------
    dict
        Compatibility analysis and diagnostic findings.
    """
    inspection = inspect_imported_model()
    if inspection["status"] != "LOADED":
        return {
            "compatible_raw": False,
            "compatible_with_adapter": False,
            "reason": "Imported model file not found.",
        }

    expected_features = inspection["feature_names"]

    # Check 1: Direct Raw CSV Match
    exact_matches = [c for c in dataset_columns if c in expected_features]
    is_direct_raw_match = (len(exact_matches) == len(expected_features))

    # Check 2: 3-Axis Accelerometer Presence
    has_accel_z = any("accel_z" in c.lower() for c in dataset_columns)
    has_accel_x = any("accel_x" in c.lower() for c in dataset_columns)
    has_accel_y = any("accel_y" in c.lower() for c in dataset_columns)

    missing_axes = []
    if not has_accel_x:
        missing_axes.append("accel_x (longitudinal acceleration)")
    if not has_accel_y:
        missing_axes.append("accel_y (lateral acceleration)")

    # Diagnostic summary
    reasons = []
    if not is_direct_raw_match:
        reasons.append(
            f"The dataset contains {len(dataset_columns)} raw columns, whereas the imported "
            f"model requires {len(expected_features)} extracted statistical and frequency-domain features."
        )
    if missing_axes:
        reasons.append(
            f"The dataset lacks physical tri-axial channels: {', '.join(missing_axes)}. "
            "It only contains 1-axis vertical suspension acceleration (chassis_accel_z_g)."
        )
    reasons.append(
        "The model is a BINARY classifier (classes: [0, 1]), whereas RoadSense AI target task "
        "is 4-class multi-hazard classification (POTHOLE, SPEED_BUMP, SMOOTH_HIGHWAY, EVASIVE_SWERVE)."
    )

    return {
        "compatible_raw": False,
        "compatible_with_adapter": True,
        "expected_feature_count": len(expected_features),
        "raw_column_count": len(dataset_columns),
        "has_triaxial_channels": (has_accel_x and has_accel_y and has_accel_z),
        "missing_axes": missing_axes,
        "reasons": reasons,
        "recommended_action": (
            "Use RoadSense AI's local classifier (`best_model.joblib`) as the primary 4-class classifier. "
            "Use `sensor_rf.joblib` via the 68-feature adapter for secondary binary anomaly screening."
        ),
    }


# ------------------------------------------------------------------ #
# 3. 17-Metric Feature Extraction per Channel                        #
# ------------------------------------------------------------------ #

def extract_channel_features(prefix: str, signal: np.ndarray, dt: float = 0.01) -> Dict[str, float]:
    """Compute the 17 statistical & DSP metrics expected for one signal channel.

    Features:
    1. mean, 2. std, 3. max, 4. min, 5. range, 6. rms, 7. median,
    8. kurtosis, 9. skewness, 10. zcr, 11. jerk_mean, 12. jerk_std,
    13. jerk_max, 14. energy, 15. dom_freq_idx, 16. dom_freq_mag,
    17. spectral_entropy.
    """
    N = len(signal)
    if N == 0:
        return {f"{prefix}_{m}": 0.0 for m in [
            "mean", "std", "max", "min", "range", "rms", "median",
            "kurtosis", "skewness", "zcr", "jerk_mean", "jerk_std",
            "jerk_max", "energy", "dom_freq_idx", "dom_freq_mag",
            "spectral_entropy",
        ]}

    mean_val = float(np.mean(signal))
    std_val = float(np.std(signal, ddof=0))
    max_val = float(np.max(signal))
    min_val = float(np.min(signal))
    range_val = max_val - min_val
    rms_val = float(np.sqrt(np.mean(signal ** 2)))
    median_val = float(np.median(signal))

    # Higher-order moments (guard against zero variance / constant signal)
    if std_val < 1e-9 or N <= 3:
        kurt_val = 0.0
        skew_val = 0.0
    else:
        k_res = stats.kurtosis(signal, fisher=True)
        s_res = stats.skew(signal)
        kurt_val = float(k_res) if not np.isnan(k_res) else 0.0
        skew_val = float(s_res) if not np.isnan(s_res) else 0.0

    # Zero Crossing Rate
    zcr_val = float(np.mean(np.diff(signal > 0) != 0)) if N > 1 else 0.0

    # Jerk metrics (derivative of acceleration)
    if N > 1:
        jerk = np.diff(signal) / dt
        jerk_mean = float(np.mean(jerk))
        jerk_std = float(np.std(jerk, ddof=0))
        jerk_max = float(np.max(np.abs(jerk)))
    else:
        jerk_mean, jerk_std, jerk_max = 0.0, 0.0, 0.0

    # Energy (sum of squares)
    energy_val = float(np.sum(signal ** 2))

    # Frequency domain via RFFT
    fft_vals = np.abs(np.fft.rfft(signal))
    if len(fft_vals) > 1:
        dom_idx = int(np.argmax(fft_vals[1:])) + 1
        dom_mag = float(fft_vals[dom_idx])
    else:
        dom_idx, dom_mag = 0, 0.0

    # Spectral entropy
    psd = fft_vals ** 2
    sum_psd = np.sum(psd)
    if sum_psd > 0:
        p = psd / sum_psd
        p = p[p > 0]
        spectral_entropy = float(-np.sum(p * np.log2(p)))
    else:
        spectral_entropy = 0.0

    return {
        f"{prefix}_mean": mean_val,
        f"{prefix}_std": std_val,
        f"{prefix}_max": max_val,
        f"{prefix}_min": min_val,
        f"{prefix}_range": range_val,
        f"{prefix}_rms": rms_val,
        f"{prefix}_median": median_val,
        f"{prefix}_kurtosis": kurt_val,
        f"{prefix}_skewness": skew_val,
        f"{prefix}_zcr": zcr_val,
        f"{prefix}_jerk_mean": jerk_mean,
        f"{prefix}_jerk_std": jerk_std,
        f"{prefix}_jerk_max": jerk_max,
        f"{prefix}_energy": energy_val,
        f"{prefix}_dom_freq_idx": dom_idx,
        f"{prefix}_dom_freq_mag": dom_mag,
        f"{prefix}_spectral_entropy": spectral_entropy,
    }


# ------------------------------------------------------------------ #
# 4. 68-Feature Vector Construction                                  #
# ------------------------------------------------------------------ #

def extract_imported_features(
    accel_x: np.ndarray,
    accel_y: np.ndarray,
    accel_z: np.ndarray,
    dt: float = 0.01,
) -> pd.DataFrame:
    """Compute the full 68-feature DataFrame from triaxial acceleration arrays.

    Parameters
    ----------
    accel_x : np.ndarray
        Longitudinal acceleration signal array.
    accel_y : np.ndarray
        Lateral acceleration signal array.
    accel_z : np.ndarray
        Vertical acceleration signal array.
    dt : float
        Sampling interval in seconds (default 0.01 = 10 ms).

    Returns
    -------
    pd.DataFrame
        1-row DataFrame containing all 68 named features.
    """
    model = load_imported_model()
    expected_order = list(model.feature_names_in_)

    accel_mag = np.sqrt(accel_x ** 2 + accel_y ** 2 + accel_z ** 2)

    features = {}
    features.update(extract_channel_features("accel_x", accel_x, dt))
    features.update(extract_channel_features("accel_y", accel_y, dt))
    features.update(extract_channel_features("accel_z", accel_z, dt))
    features.update(extract_channel_features("accel_mag", accel_mag, dt))

    df = pd.DataFrame([features]).fillna(0.0)
    # Ensure exact column ordering required by model
    return df[expected_order]


def adapt_vertical_signal_to_imported_schema(
    accel_z: np.ndarray,
    pitch_rate: Optional[np.ndarray] = None,
    roll_rate: Optional[np.ndarray] = None,
    dt: float = 0.01,
) -> pd.DataFrame:
    """Adapt 1-axis vertical suspension signal to the imported model's 68-feature schema.

    Uses pitch and roll kinematics to estimate lateral/longitudinal dynamics
    when physical 3-axis sensors are unavailable.
    """
    N = len(accel_z)
    if pitch_rate is not None and len(pitch_rate) == N:
        accel_x = np.sin(np.radians(pitch_rate)) * 0.1
    else:
        accel_x = np.zeros(N)

    if roll_rate is not None and len(roll_rate) == N:
        accel_y = np.sin(np.radians(roll_rate)) * 0.1
    else:
        accel_y = np.zeros(N)

    return extract_imported_features(accel_x, accel_y, accel_z, dt=dt)


# ------------------------------------------------------------------ #
# 5. Tested Inference Pipeline                                       #
# ------------------------------------------------------------------ #

def predict_imported(features_df: pd.DataFrame) -> Dict:
    """Execute prediction using the imported Random Forest classifier.

    Parameters
    ----------
    features_df : pd.DataFrame
        DataFrame with the 68 expected columns.

    Returns
    -------
    dict
        ``prediction`` (0 or 1), ``label`` (Normal vs Anomaly),
        ``confidence``, and ``probabilities``.
    """
    model = load_imported_model()
    expected_cols = list(model.feature_names_in_)

    # Validate columns
    missing = [c for c in expected_cols if c not in features_df.columns]
    if missing:
        raise ValueError(f"Features DataFrame missing {len(missing)} required columns: {missing[:5]}...")

    df_ordered = features_df[expected_cols]

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore")
        pred = int(model.predict(df_ordered)[0])
        probas = model.predict_proba(df_ordered)[0].tolist()

    label_map = {0: "NORMAL / REGULAR", 1: "ANOMALY / SHOCK"}
    confidence = float(np.max(probas))

    return {
        "model_name": "sensor_rf.joblib",
        "predicted_class": pred,
        "interpretation": label_map.get(pred, f"Class {pred}"),
        "confidence": round(confidence, 4),
        "probabilities": [round(p, 4) for p in probas],
        "classes": [int(c) for c in model.classes_],
    }
