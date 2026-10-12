"""Tests for FIR and IIR digital filters."""

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.filters import (
    design_fir, apply_fir,
    design_iir_butterworth, apply_iir,
    iir_coefficients_ba,
)


FS = 100.0  # 100 Hz test sampling rate


# ---- FIR filter tests ----

def test_fir_lowpass_design():
    b = design_fir(FS, cutoff=20.0, filter_type="lowpass", order=31)
    assert len(b) == 31
    assert np.isfinite(b).all()


def test_fir_highpass_design():
    b = design_fir(FS, cutoff=5.0, filter_type="highpass", order=31)
    # firwin may adjust order to odd → length 31 or 32
    assert len(b) >= 31
    assert np.isfinite(b).all()


def test_fir_bandpass_design():
    b = design_fir(FS, cutoff=[5.0, 20.0], filter_type="bandpass", order=51)
    assert len(b) >= 51
    assert np.isfinite(b).all()


def test_fir_invalid_cutoff():
    with pytest.raises(ValueError):
        design_fir(FS, cutoff=0.0)
    with pytest.raises(ValueError):
        design_fir(FS, cutoff=50.0)  # at Nyquist


def test_fir_apply_output_shape():
    sig = np.random.randn(200)
    b = design_fir(FS, cutoff=20.0, order=31)
    out = apply_fir(sig, b)
    assert out.shape == sig.shape


def test_fir_lowpass_attenuates_high_freq():
    """A 40 Hz sinusoid should be attenuated by a 10 Hz low-pass FIR."""
    t = np.arange(500) / FS
    low = np.sin(2 * np.pi * 3 * t)
    high = np.sin(2 * np.pi * 40 * t)
    sig = low + high

    b = design_fir(FS, cutoff=10.0, order=101)
    out = apply_fir(sig, b)

    # Energy of high-freq component should be reduced
    assert np.std(out) < np.std(sig)


def test_fir_short_signal():
    """FIR filter should not crash on very short signals."""
    sig = np.array([0.1, 0.2, 0.3])
    b = design_fir(FS, cutoff=20.0, order=5)
    out = apply_fir(sig, b)
    assert len(out) == len(sig)


# ---- IIR filter tests ----

def test_iir_lowpass_design():
    sos = design_iir_butterworth(FS, cutoff=20.0, filter_type="lowpass", order=4)
    assert sos.shape[1] == 6  # SOS has 6 coefficients per section
    assert np.isfinite(sos).all()


def test_iir_highpass_design():
    sos = design_iir_butterworth(FS, cutoff=5.0, filter_type="highpass", order=4)
    assert sos.shape[1] == 6
    assert np.isfinite(sos).all()


def test_iir_bandpass_design():
    sos = design_iir_butterworth(FS, cutoff=[5.0, 20.0], filter_type="bandpass", order=4)
    assert sos.shape[1] == 6
    assert np.isfinite(sos).all()


def test_iir_invalid_cutoff():
    with pytest.raises(ValueError):
        design_iir_butterworth(FS, cutoff=0.0)
    with pytest.raises(ValueError):
        design_iir_butterworth(FS, cutoff=50.0)


def test_iir_apply_output_shape():
    sig = np.random.randn(200)
    sos = design_iir_butterworth(FS, cutoff=20.0, order=4)
    out = apply_iir(sig, sos)
    assert out.shape == sig.shape


def test_iir_stability():
    """IIR Butterworth filter coefficients should be stable (|poles| < 1)."""
    b, a = iir_coefficients_ba(FS, cutoff=20.0, order=4)
    poles = np.roots(a)
    assert all(np.abs(poles) < 1.0), "Filter has poles on or outside the unit circle — unstable."


def test_iir_lowpass_attenuates_high_freq():
    """A 40 Hz sinusoid should be attenuated by a 10 Hz low-pass IIR."""
    t = np.arange(500) / FS
    low = np.sin(2 * np.pi * 3 * t)
    high = np.sin(2 * np.pi * 40 * t)
    sig = low + high

    sos = design_iir_butterworth(FS, cutoff=10.0, order=4)
    out = apply_iir(sig, sos)

    assert np.std(out) < np.std(sig)


def test_iir_short_signal():
    """IIR filter should not crash on very short signals."""
    sig = np.array([0.1, 0.2, 0.3, 0.4])
    sos = design_iir_butterworth(FS, cutoff=20.0, order=2)
    out = apply_iir(sig, sos)
    assert len(out) == len(sig)
