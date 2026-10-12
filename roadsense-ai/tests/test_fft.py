"""Tests for FFT analysis."""

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.fft_analysis import (
    compute_fft, dominant_frequency, spectral_energy,
    band_energy, spectral_centroid, spectral_spread,
    frequency_resolution,
)


FS = 100.0


def test_fft_known_sinusoid():
    """A 10 Hz sinusoid should have its dominant frequency at 10 Hz."""
    t = np.arange(1000) / FS  # 10 seconds
    sig = np.sin(2 * np.pi * 10 * t)
    freqs, mag = compute_fft(sig, FS, window="boxcar")

    dom = dominant_frequency(freqs, mag)
    assert abs(dom - 10.0) < 0.5, f"Expected ~10 Hz, got {dom}"


def test_fft_frequency_axis():
    """Frequency axis should go from 0 to fs/2."""
    sig = np.random.randn(256)
    freqs, mag = compute_fft(sig, FS)
    assert freqs[0] == 0.0
    assert freqs[-1] == pytest.approx(FS / 2, abs=FS / 256)


def test_fft_single_sided_length():
    """Single-sided FFT should have N//2+1 bins."""
    N = 256
    sig = np.random.randn(N)
    freqs, mag = compute_fft(sig, FS)
    assert len(freqs) == N // 2 + 1
    assert len(mag) == N // 2 + 1


def test_spectral_energy_nonnegative():
    sig = np.random.randn(200)
    _, mag = compute_fft(sig, FS)
    assert spectral_energy(mag) >= 0


def test_band_energy():
    """Band energy in [0, fs/2] should equal total spectral energy."""
    sig = np.random.randn(200)
    freqs, mag = compute_fft(sig, FS)
    total = spectral_energy(mag)
    full_band = band_energy(freqs, mag, 0, FS / 2)
    assert abs(total - full_band) < 1e-10


def test_spectral_centroid_range():
    sig = np.random.randn(200)
    freqs, mag = compute_fft(sig, FS)
    sc = spectral_centroid(freqs, mag)
    assert 0 <= sc <= FS / 2


def test_spectral_spread_nonnegative():
    sig = np.random.randn(200)
    freqs, mag = compute_fft(sig, FS)
    ss = spectral_spread(freqs, mag)
    assert ss >= 0


def test_frequency_resolution():
    assert frequency_resolution(100.0, 1000) == pytest.approx(0.1)
    assert frequency_resolution(100.0, 200) == pytest.approx(0.5)


def test_fft_dc_component():
    """DC-only signal should have energy at index 0 and near-zero elsewhere."""
    sig = np.ones(100) * 5.0
    freqs, mag = compute_fft(sig, FS, window="boxcar")
    # DC bin should be dominant
    assert mag[0] > mag[1:].max()


def test_fft_empty_signal():
    freqs, mag = compute_fft(np.array([]), FS)
    assert len(freqs) == 0
    assert len(mag) == 0


def test_fft_with_hann_window():
    """Hann window should still find the dominant peak."""
    t = np.arange(500) / FS
    sig = np.sin(2 * np.pi * 15 * t)
    freqs, mag = compute_fft(sig, FS, window="hann")
    dom = dominant_frequency(freqs, mag)
    assert abs(dom - 15.0) < 1.0
