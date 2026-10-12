"""
preprocessing.py — Signal preprocessing for the suspension dataset.

Provides baseline removal, windowing, and signal preparation
functions for downstream DSP analysis.
"""

from typing import List, Optional, Tuple

import numpy as np
import pandas as pd


def remove_baseline(signal: np.ndarray) -> np.ndarray:
    """Remove the DC / static gravity component (mean subtraction).

    For vertical accelerometer data the static component corresponds
    to the gravitational offset.  Subtracting the mean centres the
    signal around zero so that dynamic vibration events are isolated.

    Parameters
    ----------
    signal : np.ndarray
        Raw acceleration time series.

    Returns
    -------
    np.ndarray
        Zero-mean acceleration signal.
    """
    return signal - np.mean(signal)


def segment_by_run(df: pd.DataFrame) -> dict:
    """Split the dataset into per-run DataFrames.

    Each run represents a single simulated road event with a
    consistent hazard_type label.  This preserves the
    event-level grouping required for train/test splitting
    without data leakage.

    Returns
    -------
    dict
        Mapping ``run_id → DataFrame``.
    """
    if "run_id" not in df.columns:
        raise KeyError("Column 'run_id' not found in DataFrame.")
    return {rid: grp.sort_values("timestamp_ms").reset_index(drop=True)
            for rid, grp in df.groupby("run_id")}


def create_windows(
    signal: np.ndarray,
    window_size: int,
    overlap: float = 0.5,
) -> List[np.ndarray]:
    """Divide a 1-D signal into overlapping analysis windows.

    Parameters
    ----------
    signal : np.ndarray
        Input time-domain signal.
    window_size : int
        Number of samples per window.
    overlap : float
        Fractional overlap in [0, 1).  Default 0.5 (50 %).

    Returns
    -------
    list of np.ndarray
        Each element is a window of length ``window_size``.
        The last partial window is discarded.
    """
    if window_size < 1:
        raise ValueError("window_size must be >= 1")
    if not (0 <= overlap < 1):
        raise ValueError("overlap must be in [0, 1)")

    step = max(1, int(window_size * (1.0 - overlap)))
    windows = []
    start = 0
    while start + window_size <= len(signal):
        windows.append(signal[start : start + window_size])
        start += step
    return windows


def create_windows_with_indices(
    signal: np.ndarray,
    window_size: int,
    overlap: float = 0.5,
) -> List[Tuple[int, int, np.ndarray]]:
    """Like ``create_windows`` but also returns (start_idx, end_idx).

    Useful for mapping windows back to their position in the
    original signal.
    """
    if window_size < 1:
        raise ValueError("window_size must be >= 1")
    if not (0 <= overlap < 1):
        raise ValueError("overlap must be in [0, 1)")

    step = max(1, int(window_size * (1.0 - overlap)))
    results = []
    start = 0
    while start + window_size <= len(signal):
        end = start + window_size
        results.append((start, end, signal[start:end]))
        start += step
    return results


def prepare_run_signal(
    run_df: pd.DataFrame,
    accel_col: str = "chassis_accel_z_g",
    remove_dc: bool = True,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """Extract the acceleration signal and time vector from a run.

    Parameters
    ----------
    run_df : pd.DataFrame
        Subset of the dataset for a single run.
    accel_col : str
        Name of the acceleration column.
    remove_dc : bool
        Whether to remove the baseline (mean).

    Returns
    -------
    time_s : np.ndarray
        Time in seconds.
    accel : np.ndarray
        Acceleration array (optionally baseline-removed).
    fs : float
        Inferred sampling frequency in Hz.
    """
    run_df = run_df.sort_values("timestamp_ms")
    time_ms = run_df["timestamp_ms"].values.astype(float)
    time_s = time_ms / 1000.0

    accel = run_df[accel_col].values.astype(float)
    if remove_dc:
        accel = remove_baseline(accel)

    # Infer fs
    diffs = np.diff(time_ms)
    if len(diffs) > 0 and np.mean(diffs) > 0:
        fs = 1000.0 / np.mean(diffs)
    else:
        fs = 100.0  # nominal fallback
    return time_s, accel, fs


def get_available_accel_columns(df: pd.DataFrame) -> List[str]:
    """Return column names that contain acceleration-like data.

    Heuristic: columns containing 'accel' or 'rate' in their name
    and having float dtype.
    """
    candidates = []
    for col in df.columns:
        if any(kw in col.lower() for kw in ("accel", "rate", "displacement", "deflection")):
            if pd.api.types.is_numeric_dtype(df[col]):
                candidates.append(col)
    return candidates
