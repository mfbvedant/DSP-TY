"""
feature_extraction.py — DSP feature extraction from signal windows.

Extracts time-domain and frequency-domain features suitable for
machine-learning classification of road conditions.
"""

from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from . import fft_analysis


# ------------------------------------------------------------------ #
# Time-domain features                                               #
# ------------------------------------------------------------------ #

def time_domain_features(window: np.ndarray) -> Dict[str, float]:
    """Extract time-domain features from an acceleration window.

    Parameters
    ----------
    window : np.ndarray
        1-D array of acceleration values for one analysis window.

    Returns
    -------
    dict
        Feature name → value.
    """
    n = len(window)
    if n == 0:
        return {k: 0.0 for k in [
            "mean", "std", "variance", "rms", "min", "max",
            "peak_abs", "peak_to_peak", "crest_factor",
        ]}

    mean = float(np.mean(window))
    std = float(np.std(window, ddof=0))
    variance = float(np.var(window, ddof=0))
    rms = float(np.sqrt(np.mean(window ** 2)))
    vmin = float(np.min(window))
    vmax = float(np.max(window))
    peak_abs = float(np.max(np.abs(window)))
    peak_to_peak = vmax - vmin
    crest_factor = peak_abs / rms if rms > 0 else 0.0

    return {
        "mean": mean,
        "std": std,
        "variance": variance,
        "rms": rms,
        "min": vmin,
        "max": vmax,
        "peak_abs": peak_abs,
        "peak_to_peak": peak_to_peak,
        "crest_factor": crest_factor,
    }


# ------------------------------------------------------------------ #
# Frequency-domain features                                         #
# ------------------------------------------------------------------ #

def frequency_domain_features(
    window: np.ndarray,
    fs: float,
    fft_window: str = "hann",
) -> Dict[str, float]:
    """Extract frequency-domain features from an acceleration window.

    Parameters
    ----------
    window : np.ndarray
        1-D acceleration signal window.
    fs : float
        Sampling frequency (Hz).
    fft_window : str
        Window function for FFT (default ``'hann'``).

    Returns
    -------
    dict
        Feature name → value.
    """
    freqs, mag = fft_analysis.compute_fft(window, fs, window=fft_window)

    if len(freqs) < 2:
        return {k: 0.0 for k in [
            "dominant_freq", "spectral_centroid", "spectral_energy",
            "spectral_spread", "low_band_energy", "mid_band_energy",
            "high_band_energy",
        ]}

    f_nyq = fs / 2.0
    dom_freq = fft_analysis.dominant_frequency(freqs, mag)
    sc = fft_analysis.spectral_centroid(freqs, mag)
    se = fft_analysis.spectral_energy(mag)
    ss = fft_analysis.spectral_spread(freqs, mag, centroid=sc)

    # Band energies: low (0-5 Hz), mid (5-20 Hz), high (20-Nyquist)
    low_e = fft_analysis.band_energy(freqs, mag, 0, min(5, f_nyq))
    mid_e = fft_analysis.band_energy(freqs, mag, 5, min(20, f_nyq))
    high_e = fft_analysis.band_energy(freqs, mag, 20, f_nyq)

    return {
        "dominant_freq": dom_freq,
        "spectral_centroid": sc,
        "spectral_energy": se,
        "spectral_spread": ss,
        "low_band_energy": low_e,
        "mid_band_energy": mid_e,
        "high_band_energy": high_e,
    }


# ------------------------------------------------------------------ #
# Combined extraction for one window                                 #
# ------------------------------------------------------------------ #

def extract_features(
    window: np.ndarray,
    fs: float,
    fft_window: str = "hann",
) -> Dict[str, float]:
    """Extract all time- and frequency-domain features."""
    feats = {}
    feats.update(time_domain_features(window))
    feats.update(frequency_domain_features(window, fs, fft_window))
    return feats


# ------------------------------------------------------------------ #
# Batch extraction over a run                                        #
# ------------------------------------------------------------------ #

def extract_features_from_run(
    accel: np.ndarray,
    fs: float,
    window_size: int,
    overlap: float = 0.5,
    label: Optional[str] = None,
    run_id: Optional[str] = None,
) -> pd.DataFrame:
    """Batch-extract features from all windows in a run.

    Parameters
    ----------
    accel : np.ndarray
        Baseline-removed acceleration signal.
    fs : float
        Sampling frequency.
    window_size : int
        Samples per window.
    overlap : float
        Fractional overlap in [0, 1).
    label : str, optional
        Road-condition label for all windows from this run.
    run_id : str, optional
        Run identifier.

    Returns
    -------
    pd.DataFrame
        One row per window; columns = feature names + 'label' + 'run_id'.
    """
    from .preprocessing import create_windows  # avoid circular at top-level

    windows = create_windows(accel, window_size, overlap)
    rows = []
    for i, win in enumerate(windows):
        feats = extract_features(win, fs)
        feats["window_idx"] = i
        if label is not None:
            feats["label"] = label
        if run_id is not None:
            feats["run_id"] = run_id
        rows.append(feats)
    return pd.DataFrame(rows)


def build_feature_table(
    df: pd.DataFrame,
    accel_col: Optional[str] = None,
    window_duration_s: float = 0.5,
    overlap: float = 0.5,
) -> pd.DataFrame:
    """Build a feature table from the full dataset.

    Uses per-run segmentation so that each window inherits its
    run's ``hazard_type`` label.  Windows do not span run
    boundaries.

    Parameters
    ----------
    df : pd.DataFrame
        Full dataset with ``run_id``, ``hazard_type``, ``timestamp_ms``,
        and acceleration columns.
    accel_col : str, optional
        Name of the acceleration column (defaults to first available accel column).
    window_duration_s : float
        Analysis window length in seconds.
    overlap : float
        Fractional window overlap.

    Returns
    -------
    pd.DataFrame
    """
    from .preprocessing import segment_by_run, remove_baseline, get_available_accel_columns

    if isinstance(accel_col, (int, float)):
        # Support positional call build_feature_table(df, 0.5, 0.5)
        window_duration_s = float(accel_col)
        accel_col = None

    if accel_col is None:
        avail = get_available_accel_columns(df)
        accel_col = avail[0] if avail else "chassis_accel_z_g"

    runs = segment_by_run(df)
    all_features = []

    for rid, run_df in runs.items():
        label = run_df["hazard_type"].iloc[0]

        # Time vector and sampling rate
        ts = run_df["timestamp_ms"].values.astype(float)
        diffs = np.diff(ts)
        fs = 1000.0 / np.mean(diffs) if len(diffs) > 0 and np.mean(diffs) > 0 else 100.0

        accel = run_df[accel_col].values.astype(float)
        accel = remove_baseline(accel)

        window_size = max(1, int(fs * window_duration_s))
        feat_df = extract_features_from_run(
            accel, fs, window_size, overlap, label=label, run_id=rid
        )
        all_features.append(feat_df)

    if all_features:
        return pd.concat(all_features, ignore_index=True)
    return pd.DataFrame()


# ------------------------------------------------------------------ #
# Feature explanations (for the dashboard)                           #
# ------------------------------------------------------------------ #

FEATURE_DESCRIPTIONS = {
    "mean": "Average acceleration value in the window.",
    "std": "Standard deviation — spread of acceleration values.",
    "variance": "Variance of the acceleration signal.",
    "rms": "Root Mean Square — overall signal energy/amplitude.",
    "min": "Minimum acceleration in the window.",
    "max": "Maximum acceleration in the window.",
    "peak_abs": "Peak absolute acceleration.",
    "peak_to_peak": "Difference between max and min acceleration.",
    "crest_factor": "Ratio of peak value to RMS; indicates impulsiveness.",
    "dominant_freq": "Frequency (Hz) with the highest spectral magnitude.",
    "spectral_centroid": "Weighted average frequency — 'centre of mass' of the spectrum.",
    "spectral_energy": "Total spectral energy (Σ|X|²).",
    "spectral_spread": "Standard deviation of the spectrum around the centroid.",
    "low_band_energy": "Spectral energy in the 0–5 Hz band.",
    "mid_band_energy": "Spectral energy in the 5–20 Hz band.",
    "high_band_energy": "Spectral energy in the 20–Nyquist Hz band.",
}
