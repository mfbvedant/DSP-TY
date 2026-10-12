"""
data_loader.py — Load and validate the suspension CSV dataset.

This module provides functions to load the raw CSV, validate the
expected schema, detect anomalies, and return a clean DataFrame
for downstream DSP processing.
"""

from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np


# ------------------------------------------------------------------ #
# Expected schema (from the dataset README)                          #
# ------------------------------------------------------------------ #
EXPECTED_COLUMNS = [
    "run_id",
    "timestamp_ms",
    "hazard_type",
    "vehicle_speed_kmh",
    "baseline_clearance_mm",
    "dynamic_ground_clearance_mm",
    "chassis_accel_z_g",
    "wheel_displacement_mm",
    "suspension_deflection_mm",
    "pitch_rate_deg_s",
    "roll_rate_deg_s",
    "tire_normal_force_n",
]

NUMERIC_COLUMNS = [
    "timestamp_ms",
    "vehicle_speed_kmh",
    "baseline_clearance_mm",
    "dynamic_ground_clearance_mm",
    "chassis_accel_z_g",
    "wheel_displacement_mm",
    "suspension_deflection_mm",
    "pitch_rate_deg_s",
    "roll_rate_deg_s",
    "tire_normal_force_n",
]

# Stated sampling frequency in the dataset documentation
NOMINAL_SAMPLING_FREQ_HZ = 100  # 100 Hz → 10 ms intervals


def find_dataset(data_dir: Optional[Path] = None) -> Path:
    """Locate the first CSV file in the data/ directory.

    Parameters
    ----------
    data_dir : Path, optional
        Override default data directory.

    Returns
    -------
    Path
        Resolved path to the CSV file.

    Raises
    ------
    FileNotFoundError
        If no CSV is found.
    """
    if data_dir is None:
        data_dir = Path(__file__).resolve().parent.parent / "data"
    csv_files = list(data_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found in {data_dir}. "
            "Please place the dataset CSV in the data/ directory."
        )
    return csv_files[0]


def load_csv(filepath: Optional[Path] = None) -> pd.DataFrame:
    """Load the raw CSV into a pandas DataFrame.

    Parameters
    ----------
    filepath : Path, optional
        Explicit path to CSV.  Auto-detected if omitted.

    Returns
    -------
    pd.DataFrame
    """
    if filepath is None:
        filepath = find_dataset()
    df = pd.read_csv(filepath)
    return df


def validate_columns(df: pd.DataFrame) -> dict:
    """Check that expected columns exist and report discrepancies.

    Returns
    -------
    dict
        Keys: 'present', 'missing', 'extra', 'valid' (bool).
    """
    actual = set(df.columns)
    expected = set(EXPECTED_COLUMNS)
    return {
        "present": sorted(actual & expected),
        "missing": sorted(expected - actual),
        "extra": sorted(actual - expected),
        "valid": expected.issubset(actual),
    }


def inspect_dataset(df: pd.DataFrame) -> dict:
    """Generate an inspection report of the dataset.

    Returns a dictionary with summary statistics useful for the
    data-inspection phase.
    """
    col_report = validate_columns(df)

    # Basic shape
    n_rows, n_cols = df.shape

    # Missing values per column
    missing = df.isnull().sum().to_dict()

    # Duplicate rows
    n_duplicates = int(df.duplicated().sum())

    # Data types
    dtypes = df.dtypes.astype(str).to_dict()

    # Class distribution (hazard_type)
    class_dist = {}
    if "hazard_type" in df.columns:
        class_dist = df["hazard_type"].value_counts().to_dict()

    # Run IDs
    run_ids = []
    if "run_id" in df.columns:
        run_ids = sorted(df["run_id"].unique().tolist())

    # Sampling frequency analysis per run
    sampling_info = {}
    if "timestamp_ms" in df.columns and "run_id" in df.columns:
        for rid in run_ids:
            ts = df.loc[df["run_id"] == rid, "timestamp_ms"].sort_values().values
            if len(ts) > 1:
                diffs = np.diff(ts)
                sampling_info[rid] = {
                    "n_samples": int(len(ts)),
                    "duration_ms": float(ts[-1] - ts[0]),
                    "min_interval_ms": float(diffs.min()),
                    "max_interval_ms": float(diffs.max()),
                    "mean_interval_ms": float(diffs.mean()),
                    "inferred_fs_hz": float(1000.0 / diffs.mean()) if diffs.mean() > 0 else 0.0,
                    "irregular_intervals": int((diffs != diffs[0]).sum()),
                }

    # Numeric summaries for key signal columns
    signal_stats = {}
    for col in NUMERIC_COLUMNS:
        if col in df.columns:
            signal_stats[col] = {
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "mean": float(df[col].mean()),
                "std": float(df[col].std()),
            }

    return {
        "n_rows": n_rows,
        "n_cols": n_cols,
        "columns": col_report,
        "missing_values": missing,
        "n_duplicates": n_duplicates,
        "dtypes": dtypes,
        "class_distribution": class_dist,
        "run_ids": run_ids,
        "sampling_info": sampling_info,
        "signal_stats": signal_stats,
    }


def get_sampling_frequency(df: pd.DataFrame) -> float:
    """Infer the dominant sampling frequency from timestamps.

    Falls back to the nominal 100 Hz if calculation is not possible.
    """
    if "timestamp_ms" not in df.columns:
        return float(NOMINAL_SAMPLING_FREQ_HZ)
    ts = df["timestamp_ms"].sort_values().values
    if len(ts) < 2:
        return float(NOMINAL_SAMPLING_FREQ_HZ)
    diffs = np.diff(ts)
    # Use the mode (most common interval)
    vals, counts = np.unique(diffs, return_counts=True)
    mode_interval = vals[counts.argmax()]
    if mode_interval <= 0:
        return float(NOMINAL_SAMPLING_FREQ_HZ)
    return float(1000.0 / mode_interval)
