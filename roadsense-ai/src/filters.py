"""
filters.py — FIR and IIR digital filter design and application.

Uses ``scipy.signal`` for filter design.  Supports low-pass,
high-pass, and band-pass for both FIR and IIR (Butterworth)
topologies.

Notes
-----
* For offline (non-causal) analysis the module uses ``filtfilt``
  (zero-phase forward-backward filtering).  This is **not** a
  causal real-time implementation — it is appropriate for batch
  analysis where the full signal is available.
* Second-order sections (``sosfiltfilt``) are used for IIR
  filters to improve numerical stability.
"""

from typing import Optional, Tuple

import numpy as np
from scipy import signal
import plotly.graph_objects as go
from plotly.subplots import make_subplots


# ------------------------------------------------------------------ #
# FIR filter                                                         #
# ------------------------------------------------------------------ #

def design_fir(
    fs: float,
    cutoff: float | list,
    filter_type: str = "lowpass",
    order: int = 51,
) -> np.ndarray:
    """Design an FIR filter using the window method (``scipy.signal.firwin``).

    Parameters
    ----------
    fs : float
        Sampling frequency (Hz).
    cutoff : float or list of float
        Cutoff frequency/frequencies (Hz).  A single value for
        low-pass / high-pass; a pair ``[low, high]`` for band-pass.
    filter_type : str
        ``'lowpass'``, ``'highpass'``, or ``'bandpass'``.
    order : int
        Filter order (number of taps = order).
        Must be odd for high-pass / band-pass with firwin.

    Returns
    -------
    b : np.ndarray
        FIR filter coefficients.
    """
    nyq = fs / 2.0

    # Validate cutoff against Nyquist
    if isinstance(cutoff, (list, tuple)):
        for c in cutoff:
            if c <= 0 or c >= nyq:
                raise ValueError(
                    f"Cutoff {c} Hz must be in (0, {nyq}) Hz (Nyquist)."
                )
    else:
        if cutoff <= 0 or cutoff >= nyq:
            raise ValueError(
                f"Cutoff {cutoff} Hz must be in (0, {nyq}) Hz (Nyquist)."
            )

    if filter_type == "lowpass":
        b = signal.firwin(order, cutoff, fs=fs, pass_zero=True)
    elif filter_type == "highpass":
        # firwin high-pass requires odd number of taps
        if order % 2 == 0:
            order += 1
        b = signal.firwin(order, cutoff, fs=fs, pass_zero=False)
    elif filter_type == "bandpass":
        if not isinstance(cutoff, (list, tuple)) or len(cutoff) != 2:
            raise ValueError("Band-pass requires cutoff = [low, high].")
        if order % 2 == 0:
            order += 1
        b = signal.firwin(order, cutoff, fs=fs, pass_zero=False)
    else:
        raise ValueError(f"Unknown filter_type '{filter_type}'.")
    return b


def apply_fir(
    sig: np.ndarray,
    b: np.ndarray,
) -> np.ndarray:
    """Apply an FIR filter using zero-phase filtering.

    Uses ``scipy.signal.filtfilt`` which applies the filter
    forward and backward, eliminating phase distortion.
    This is a **non-causal, offline** technique.

    Short signals are handled by reducing padlen.
    """
    a = np.array([1.0])
    padlen = min(3 * len(b), len(sig) - 1)
    if padlen < 1:
        # Signal too short for filtfilt; fall back to lfilter
        return signal.lfilter(b, a, sig)
    return signal.filtfilt(b, a, sig, padlen=padlen)


# ------------------------------------------------------------------ #
# IIR filter (Butterworth)                                           #
# ------------------------------------------------------------------ #

def design_iir_butterworth(
    fs: float,
    cutoff: float | list,
    filter_type: str = "lowpass",
    order: int = 4,
) -> np.ndarray:
    """Design a Butterworth IIR filter (second-order sections).

    Parameters
    ----------
    fs : float
        Sampling frequency (Hz).
    cutoff : float or list
        Cutoff frequency/frequencies (Hz).
    filter_type : str
        ``'lowpass'``, ``'highpass'``, or ``'bandpass'``.
    order : int
        Filter order.

    Returns
    -------
    sos : np.ndarray
        Second-order sections representation.
    """
    nyq = fs / 2.0

    if isinstance(cutoff, (list, tuple)):
        for c in cutoff:
            if c <= 0 or c >= nyq:
                raise ValueError(
                    f"Cutoff {c} Hz must be in (0, {nyq}) Hz (Nyquist)."
                )
        btype = "bandpass"
    else:
        if cutoff <= 0 or cutoff >= nyq:
            raise ValueError(
                f"Cutoff {cutoff} Hz must be in (0, {nyq}) Hz (Nyquist)."
            )
        btype = filter_type
        if btype == "bandpass":
            raise ValueError("Band-pass requires cutoff = [low, high].")

    sos = signal.butter(order, cutoff, btype=btype, fs=fs, output="sos")
    return sos


def apply_iir(
    sig: np.ndarray,
    sos: np.ndarray,
) -> np.ndarray:
    """Apply IIR filter using zero-phase SOS filtering.

    Uses ``scipy.signal.sosfiltfilt`` for numerical stability.
    Short signals are handled by reducing padlen.
    """
    padlen = min(3 * sos.shape[0], len(sig) - 1)
    if padlen < 1:
        return signal.sosfilt(sos, sig)
    return signal.sosfiltfilt(sos, sig, padlen=padlen)


# ------------------------------------------------------------------ #
# IIR coefficients retrieval (b, a form for display)                 #
# ------------------------------------------------------------------ #

def iir_coefficients_ba(
    fs: float,
    cutoff: float | list,
    filter_type: str = "lowpass",
    order: int = 4,
) -> Tuple[np.ndarray, np.ndarray]:
    """Return Butterworth filter coefficients in (b, a) form.

    Provided for educational display; **sos** form should be
    used for actual filtering.
    """
    nyq = fs / 2.0
    if isinstance(cutoff, (list, tuple)):
        btype = "bandpass"
    else:
        btype = filter_type
    b, a = signal.butter(order, cutoff, btype=btype, fs=fs, output="ba")
    return b, a


# ------------------------------------------------------------------ #
# Frequency response plots                                          #
# ------------------------------------------------------------------ #

def plot_frequency_response_fir(
    b: np.ndarray,
    fs: float,
    title: str = "FIR Filter Frequency Response",
) -> go.Figure:
    """Plot magnitude and phase response for an FIR filter."""
    w, h = signal.freqz(b, worN=2048, fs=fs)
    mag_db = 20 * np.log10(np.abs(h) + 1e-12)
    phase_deg = np.degrees(np.unwrap(np.angle(h)))

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=["Magnitude Response (dB)",
                                        "Phase Response (degrees)"])
    fig.add_trace(go.Scatter(x=w, y=mag_db, mode="lines",
                             name="Magnitude",
                             line=dict(color="#6366f1")),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=w, y=phase_deg, mode="lines",
                             name="Phase",
                             line=dict(color="#f43f5e")),
                  row=2, col=1)
    fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
    fig.update_yaxes(title_text="dB", row=1, col=1)
    fig.update_yaxes(title_text="Degrees", row=2, col=1)
    fig.update_layout(title=title, height=500, template="plotly_dark")
    return fig


def plot_frequency_response_iir(
    sos: np.ndarray,
    fs: float,
    title: str = "IIR Butterworth Frequency Response",
) -> go.Figure:
    """Plot magnitude and phase response for an IIR filter (SOS)."""
    w, h = signal.sosfreqz(sos, worN=2048, fs=fs)
    mag_db = 20 * np.log10(np.abs(h) + 1e-12)
    phase_deg = np.degrees(np.unwrap(np.angle(h)))

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=["Magnitude Response (dB)",
                                        "Phase Response (degrees)"])
    fig.add_trace(go.Scatter(x=w, y=mag_db, mode="lines",
                             name="Magnitude",
                             line=dict(color="#22d3ee")),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=w, y=phase_deg, mode="lines",
                             name="Phase",
                             line=dict(color="#facc15")),
                  row=2, col=1)
    fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
    fig.update_yaxes(title_text="dB", row=1, col=1)
    fig.update_yaxes(title_text="Degrees", row=2, col=1)
    fig.update_layout(title=title, height=500, template="plotly_dark")
    return fig


def plot_original_vs_filtered(
    time_s: np.ndarray,
    original: np.ndarray,
    filtered: np.ndarray,
    title: str = "Original vs Filtered Signal",
) -> go.Figure:
    """Overlay original and filtered signals."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=time_s, y=original, mode="lines",
                             name="Original",
                             line=dict(color="#94a3b8", width=1)))
    fig.add_trace(go.Scatter(x=time_s, y=filtered, mode="lines",
                             name="Filtered",
                             line=dict(color="#6366f1", width=2)))
    fig.update_layout(title=title, xaxis_title="Time (s)",
                      yaxis_title="Acceleration (g)",
                      height=380, template="plotly_dark")
    return fig
