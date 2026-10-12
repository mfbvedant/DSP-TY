"""
evaluation.py — Model evaluation helpers and report generation.

Generates confusion matrix plots, metric tables, and exportable
evaluation reports.
"""

from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.figure_factory as ff


OUTPUTS_DIR = Path(__file__).resolve().parent.parent / "outputs"


def plot_confusion_matrix(
    cm: np.ndarray,
    labels: List[str],
    title: str = "Confusion Matrix",
) -> go.Figure:
    """Create an annotated confusion-matrix heatmap."""
    # Normalize for colour scale
    cm_norm = cm.astype(float)
    row_sums = cm_norm.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    cm_pct = cm_norm / row_sums * 100

    # Annotation text: count (pct%)
    text = []
    for i in range(len(labels)):
        row = []
        for j in range(len(labels)):
            row.append(f"{cm[i][j]}<br>({cm_pct[i][j]:.0f}%)")
        text.append(row)

    fig = go.Figure(data=go.Heatmap(
        z=cm_pct,
        x=labels,
        y=labels,
        text=text,
        texttemplate="%{text}",
        colorscale="Purples",
        showscale=True,
        colorbar=dict(title="%"),
    ))
    fig.update_layout(
        title=title,
        xaxis_title="Predicted",
        yaxis_title="Actual",
        height=450,
        template="plotly_dark",
        yaxis=dict(autorange="reversed"),
    )
    return fig


def metrics_table(results: Dict) -> pd.DataFrame:
    """Create a summary metrics DataFrame."""
    rows = []
    for model_name, metrics in results.items():
        if isinstance(metrics, dict) and "accuracy" in metrics:
            rows.append({
                "Model": model_name,
                "Accuracy": f"{metrics['accuracy']:.4f}",
                "Precision": f"{metrics['precision']:.4f}",
                "Recall": f"{metrics['recall']:.4f}",
                "F1-Score": f"{metrics['f1']:.4f}",
            })
    return pd.DataFrame(rows)


def save_evaluation_report(
    results: Dict,
    filepath: Path = None,
) -> Path:
    """Save evaluation metrics to a CSV file."""
    if filepath is None:
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        filepath = OUTPUTS_DIR / "evaluation_report.csv"
    df = metrics_table(results)
    df.to_csv(filepath, index=False)
    return filepath


def save_classification_reports(
    results: Dict,
    filepath: Path = None,
) -> Path:
    """Save per-class classification reports to a text file."""
    if filepath is None:
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        filepath = OUTPUTS_DIR / "classification_reports.txt"
    with open(filepath, "w") as f:
        for model_name, metrics in results.items():
            if isinstance(metrics, dict) and "classification_report" in metrics:
                f.write(f"{'='*60}\n")
                f.write(f"Model: {model_name}\n")
                f.write(f"{'='*60}\n")
                f.write(metrics["classification_report"])
                f.write("\n\n")
    return filepath
