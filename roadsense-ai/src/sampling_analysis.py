"""
sampling_analysis.py — Sampling theory concepts and visualisation helpers.

Demonstrates continuous-vs-discrete, Nyquist, aliasing,
and sampling-frequency concepts using both the real dataset
and illustrative synthetic signals.
"""

import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def nyquist_frequency(fs: float) -> float:
    """Return the Nyquist frequency for sampling rate *fs* Hz."""
    return fs / 2.0


def sampling_interval(fs: float) -> float:
    """Return the sampling interval Ts = 1/fs in seconds."""
    return 1.0 / fs


def demonstrate_sampling(
    freq: float = 5.0,
    fs: float = 100.0,
    duration: float = 1.0,
) -> go.Figure:
    """Create an illustrative plot showing continuous vs. discrete sampling.

    This uses a **synthetic** sinusoid purely for pedagogical purposes;
    it is NOT derived from the vehicle dataset.

    Parameters
    ----------
    freq : float
        Frequency of the illustrative sinusoid (Hz).
    fs : float
        Sampling frequency (Hz).
    duration : float
        Signal duration (seconds).

    Returns
    -------
    go.Figure
    """
    # Dense "continuous" reference
    t_cont = np.linspace(0, duration, int(10_000 * duration), endpoint=False)
    x_cont = np.sin(2 * np.pi * freq * t_cont)

    # Sampled version
    n_samples = int(fs * duration)
    t_sampled = np.arange(n_samples) / fs
    x_sampled = np.sin(2 * np.pi * freq * t_sampled)

    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=[
                            f"Continuous-Time Sinusoid  f = {freq} Hz  (illustrative)",
                            f"Discrete-Time Samples  fs = {fs} Hz  Ts = {1/fs*1000:.1f} ms"
                        ])
    fig.add_trace(go.Scatter(x=t_cont, y=x_cont, mode="lines",
                             name="x(t) continuous", line=dict(color="#6366f1")),
                  row=1, col=1)
    fig.add_trace(go.Scatter(x=t_sampled, y=x_sampled, mode="markers",
                             name="x[n] sampled",
                             marker=dict(size=5, color="#f43f5e")),
                  row=2, col=1)
    # Also overlay the continuous curve faintly for reference
    fig.add_trace(go.Scatter(x=t_cont, y=x_cont, mode="lines",
                             name="x(t) reference",
                             line=dict(color="#6366f1", dash="dot", width=1),
                             showlegend=False),
                  row=2, col=1)

    fig.update_xaxes(title_text="Time (s)", row=2, col=1)
    fig.update_yaxes(title_text="Amplitude", row=1, col=1)
    fig.update_yaxes(title_text="Amplitude", row=2, col=1)
    fig.update_layout(height=500, template="plotly_dark",
                      title_text="Sampling: Continuous vs Discrete Signal (Illustrative)")
    return fig


def demonstrate_aliasing(
    freq: float = 5.0,
    fs: float = 8.0,
    duration: float = 1.0,
) -> go.Figure:
    """Show aliasing when fs < 2·fmax.

    Parameters
    ----------
    freq : float
        Signal frequency (Hz).
    fs : float
        Under-sampling rate (Hz).  Should be < 2*freq to show aliasing.
    duration : float
        Signal duration (s).

    Returns
    -------
    go.Figure
    """
    t_cont = np.linspace(0, duration, 10_000, endpoint=False)
    x_cont = np.sin(2 * np.pi * freq * t_cont)

    n = int(fs * duration)
    t_s = np.arange(n) / fs
    x_s = np.sin(2 * np.pi * freq * t_s)

    # Aliased frequency
    f_alias = abs(freq - fs * round(freq / fs))

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=t_cont, y=x_cont, mode="lines",
                             name=f"Original f={freq} Hz",
                             line=dict(color="#6366f1")))
    fig.add_trace(go.Scatter(x=t_s, y=x_s, mode="markers+lines",
                             name=f"Sampled fs={fs} Hz",
                             marker=dict(size=7, color="#f43f5e"),
                             line=dict(color="#f43f5e", dash="dash")))
    fig.update_layout(
        title=f"Aliasing Demo: f={freq} Hz sampled at fs={fs} Hz  →  alias ≈ {f_alias:.1f} Hz  (Illustrative)",
        xaxis_title="Time (s)", yaxis_title="Amplitude",
        height=400, template="plotly_dark",
    )
    return fig


def plot_signal_time_domain(
    time_s: np.ndarray,
    signal: np.ndarray,
    title: str = "Signal",
    ylabel: str = "Amplitude",
    color: str = "#6366f1",
) -> go.Figure:
    """Generic time-domain plot."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=time_s, y=signal, mode="lines",
                             name=title, line=dict(color=color)))
    fig.update_layout(title=title, xaxis_title="Time (s)",
                      yaxis_title=ylabel, height=350,
                      template="plotly_dark")
    return fig


def plot_sampling_points(
    time_s: np.ndarray,
    signal: np.ndarray,
    fs: float,
    title: str = "Sampling Points",
) -> go.Figure:
    """Overlay sampling markers on the time-domain signal."""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=time_s, y=signal, mode="lines",
                             name="Signal",
                             line=dict(color="#6366f1", width=1)))
    fig.add_trace(go.Scatter(x=time_s, y=signal, mode="markers",
                             name="Samples",
                             marker=dict(size=4, color="#f43f5e")))
    ts_ms = 1000.0 / fs
    fig.update_layout(
        title=f"{title}  |  fs = {fs:.1f} Hz  |  Ts = {ts_ms:.2f} ms  |  f_Nyquist = {fs/2:.1f} Hz",
        xaxis_title="Time (s)", yaxis_title="Amplitude (g)",
        height=380, template="plotly_dark",
    )
    return fig
