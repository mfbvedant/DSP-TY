"""
fft_analysis.py — FFT-based frequency-domain analysis.

Computes single-sided magnitude spectra, dominant frequencies,
spectral energy, and provides comparison plots across road classes.
"""

from typing import Optional, Tuple

import numpy as np
from scipy.fft import fft, fftfreq
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def compute_fft(
    signal: np.ndarray,
    fs: float,
    window: str = "hann",
) -> Tuple[np.ndarray, np.ndarray]:
    """Compute the single-sided FFT magnitude spectrum.

    Parameters
    ----------
    signal : np.ndarray
        Time-domain signal.
    fs : float
        Sampling frequency (Hz).
    window : str
        Window function name (from ``numpy``).  Use ``'boxcar'``
        for rectangular (no windowing).  Default ``'hann'`` to
        reduce spectral leakage.

    Returns
    -------
    freqs : np.ndarray
        Frequency axis (Hz), single-sided (0 … fs/2).
    magnitude : np.ndarray
        Normalised magnitude spectrum (single-sided).
    """
    N = len(signal)
    if N == 0:
        return np.array([]), np.array([])

    # Apply window function
    if window == "boxcar" or window is None:
        win = np.ones(N)
    else:
        win = getattr(np, window, np.hanning)(N)

    windowed = signal * win

    # FFT
    yf = fft(windowed)
    # Single-sided: take first N//2+1 bins
    n_bins = N // 2 + 1
    # Use linspace to build a correct 0..fs/2 axis (fftfreq gives
    # a negative Nyquist bin for even N, which breaks downstream code)
    freqs = np.linspace(0, fs / 2, n_bins)
    magnitude = (2.0 / N) * np.abs(yf[:n_bins])
    # DC component (index 0) should not be doubled
    magnitude[0] /= 2.0
    return freqs, magnitude


def dominant_frequency(freqs: np.ndarray, magnitude: np.ndarray) -> float:
    """Return the frequency (Hz) with the highest magnitude.

    Skips the DC bin (index 0).
    """
    if len(freqs) < 2:
        return 0.0
    idx = np.argmax(magnitude[1:]) + 1  # skip DC
    return float(freqs[idx])


def spectral_energy(magnitude: np.ndarray) -> float:
    """Parseval-related total spectral energy (sum of |X|²)."""
    return float(np.sum(magnitude ** 2))


def band_energy(
    freqs: np.ndarray,
    magnitude: np.ndarray,
    f_low: float,
    f_high: float,
) -> float:
    """Compute spectral energy in a frequency band [f_low, f_high]."""
    mask = (freqs >= f_low) & (freqs <= f_high)
    return float(np.sum(magnitude[mask] ** 2))


def spectral_centroid(freqs: np.ndarray, magnitude: np.ndarray) -> float:
    """Spectral centroid — weighted average frequency."""
    total = np.sum(magnitude)
    if total == 0:
        return 0.0
    return float(np.sum(freqs * magnitude) / total)


def spectral_spread(
    freqs: np.ndarray,
    magnitude: np.ndarray,
    centroid: Optional[float] = None,
) -> float:
    """Spectral spread (standard deviation of the spectrum)."""
    if centroid is None:
        centroid = spectral_centroid(freqs, magnitude)
    total = np.sum(magnitude)
    if total == 0:
        return 0.0
    return float(np.sqrt(np.sum(((freqs - centroid) ** 2) * magnitude) / total))


def frequency_resolution(fs: float, N: int) -> float:
    """Return the frequency resolution Δf = fs / N."""
    return fs / N if N > 0 else 0.0


# ------------------------------------------------------------------ #
# Plots                                                              #
# ------------------------------------------------------------------ #

def plot_magnitude_spectrum(
    freqs: np.ndarray,
    magnitude: np.ndarray,
    title: str = "FFT Magnitude Spectrum",
    color: str = "#6366f1",
) -> go.Figure:
    """Bar/line plot of the single-sided magnitude spectrum."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=freqs, y=magnitude, mode="lines",
                             fill="tozeroy",
                             name="Magnitude",
                             line=dict(color=color)))
    fig.update_layout(title=title, xaxis_title="Frequency (Hz)",
                      yaxis_title="Magnitude",
                      height=380, template="plotly_dark")
    return fig


def plot_spectrum_comparison(
    spectra: dict,
    title: str = "Spectral Comparison by Road Class",
) -> go.Figure:
    """Overlay spectra from different road classes.

    Parameters
    ----------
    spectra : dict
        ``{label: (freqs, magnitude), ...}``
    """
    colors = ["#6366f1", "#f43f5e", "#22d3ee", "#facc15", "#4ade80"]
    fig = go.Figure()
    for i, (label, (f, m)) in enumerate(spectra.items()):
        fig.add_trace(go.Scatter(x=f, y=m, mode="lines",
                                 name=label,
                                 line=dict(color=colors[i % len(colors)])))
    fig.update_layout(title=title, xaxis_title="Frequency (Hz)",
                      yaxis_title="Magnitude",
                      height=420, template="plotly_dark")
    return fig


def plot_original_vs_filtered_spectrum(
    freqs_orig: np.ndarray,
    mag_orig: np.ndarray,
    freqs_filt: np.ndarray,
    mag_filt: np.ndarray,
    title: str = "Original vs Filtered Spectrum",
) -> go.Figure:
    """Compare original and filtered spectra."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=freqs_orig, y=mag_orig, mode="lines",
                             name="Original",
                             line=dict(color="#94a3b8", width=1)))
    fig.add_trace(go.Scatter(x=freqs_filt, y=mag_filt, mode="lines",
                             name="Filtered",
                             line=dict(color="#6366f1", width=2)))
    fig.update_layout(title=title, xaxis_title="Frequency (Hz)",
                      yaxis_title="Magnitude",
                      height=380, template="plotly_dark")
    return fig
