import React, { useState, useEffect } from 'react';
import { BarChart3, HelpCircle, AlertCircle, Activity } from 'lucide-react';
import { UserSignalData, userSignalFFT, FFTResponse } from '../api';
import { FFTCanvas } from '../components/FFTCanvas';

interface FFTAnalyzerPageProps {
  userSignal: UserSignalData | null;
}

export const FFTAnalyzerPage: React.FC<FFTAnalyzerPageProps> = ({ userSignal }) => {
  const [winIdx, setWinIdx] = useState<number>(0);
  const [winDur, setWinDur] = useState<number>(0.5);
  const [windowFunc, setWindowFunc] = useState<string>('hann');

  const [fftData, setFftData] = useState<(FFTResponse & { total_windows?: number }) | null>(null);
  const [totalWindows, setTotalWindows] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  const nyquistHz = userSignal ? userSignal.fs / 2 : 50;

  useEffect(() => {
    if (!userSignal) return;
    setLoading(true);

    userSignalFFT({
      signal: userSignal.signal,
      fs: userSignal.fs,
      window_idx: winIdx,
      window_duration_s: winDur,
      window_function: windowFunc,
    })
      .then((res) => {
        setFftData(res);
        if (res.total_windows) setTotalWindows(res.total_windows);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userSignal, winIdx, winDur, windowFunc]);

  // No user signal — show guidance
  if (!userSignal) {
    return (
      <div className="space-y-6">
        <div className="border-b border-[#E2E6EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            FFT Spectral Analyzer
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5">
            Discrete frequency-domain spectral magnitude decomposition, window tapering, and resonant peak tracking.
          </p>
        </div>

        <div className="eng-card p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#5579A8] mx-auto" />
          <h2 className="text-lg font-semibold text-[#253247]">No Signal Data Loaded</h2>
          <p className="text-sm text-[#5A6B82] max-w-lg mx-auto">
            Go to the <strong>Overview</strong> page, paste or upload your vibration data, and click <strong>"Analyse Road"</strong>.
            Once analyzed, your signal data will automatically flow here for spectral decomposition.
          </p>
          <div className="pt-2 text-xs text-[#8492A6]">
            The FFT Analyzer operates on the signal you provide on the main page — no pre-loaded dataset is used.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-[#E2E6EC] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
          FFT Spectral Analyzer
        </h1>
        <p className="text-xs text-[#5A6B82] mt-0.5">
          Discrete frequency-domain spectral magnitude decomposition, window tapering, and resonant peak tracking.
        </p>
      </div>

      {/* Active Signal Source Banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[#E8F5E9] border border-[#A5D6A7] text-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse shrink-0" />
        <div>
          <span className="font-semibold text-[#2E7D32]">Active Signal Source:</span>{' '}
          <span className="font-mono text-[#253247]">
            {userSignal.filename} — {userSignal.totalSamples} samples @ {userSignal.fs} Hz ({userSignal.channel})
          </span>
        </div>
      </div>

      {/* FFT Controls */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Window Function</label>
            <select
              value={windowFunc}
              onChange={(e) => setWindowFunc(e.target.value)}
              className="clean-select w-full"
            >
              <option value="hann">Hann (Recommended — Low Leakage)</option>
              <option value="hamming">Hamming (Narrow Main Lobe)</option>
              <option value="blackman">Blackman (High Stopband Attenuation)</option>
              <option value="boxcar">Boxcar / Rectangular (No Taper)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Window Duration</label>
            <select
              value={winDur}
              onChange={(e) => {
                setWinDur(parseFloat(e.target.value));
                setWinIdx(0);
              }}
              className="clean-select w-full"
            >
              <option value="0.25">0.25 s ({Math.round(userSignal.fs * 0.25)} samples, Δf = {(userSignal.fs / Math.round(userSignal.fs * 0.25)).toFixed(1)} Hz)</option>
              <option value="0.5">0.50 s ({Math.round(userSignal.fs * 0.5)} samples, Δf = {(userSignal.fs / Math.round(userSignal.fs * 0.5)).toFixed(1)} Hz)</option>
              <option value="1.0">1.00 s ({Math.round(userSignal.fs * 1.0)} samples, Δf = {(userSignal.fs / Math.round(userSignal.fs * 1.0)).toFixed(1)} Hz)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#5A6B82] mb-1">
              <span>Segment Index</span>
              <span className="font-semibold text-[#253247]">Window {winIdx + 1} of {totalWindows}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalWindows - 1)}
              value={winIdx}
              onChange={(e) => setWinIdx(parseInt(e.target.value))}
              className="w-full accent-[#5579A8] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Spectral Indicators */}
      {fftData && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Dominant Frequency</div>
            <div className="text-xl font-bold text-[#C62828] mt-1">{fftData.dominant_freq_hz.toFixed(2)} Hz</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Peak resonant mode</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Spectral Centroid</div>
            <div className="text-xl font-bold text-[#5579A8] mt-1">{fftData.spectral_centroid_hz.toFixed(2)} Hz</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Spectral center-of-mass</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Spectral Spread</div>
            <div className="text-xl font-bold text-[#253247] mt-1">{fftData.spectral_spread_hz.toFixed(2)} Hz</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Bandwidth dispersion</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Resolution (Δf)</div>
            <div className="text-xl font-bold text-[#253247] mt-1">{fftData.frequency_resolution_hz.toFixed(2)} Hz</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Bin spacing = fs / N</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Nyquist Boundary</div>
            <div className="text-xl font-bold text-[#253247] mt-1">{nyquistHz.toFixed(1)} Hz</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">fs / 2 (no aliasing)</div>
          </div>
        </div>
      )}

      {/* FFT Canvas Visualizer */}
      {fftData && (
        <FFTCanvas
          freqs={fftData.freqs_hz}
          magnitude={fftData.magnitude}
          dominantFreq={fftData.dominant_freq_hz}
          nyquistFreq={nyquistHz}
          title={`FFT Magnitude Spectrum — ${userSignal.filename} (Window ${winIdx + 1}, ${windowFunc.toUpperCase()} Taper)`}
          height={320}
        />
      )}

      {loading && !fftData && (
        <div className="eng-card p-8 text-center text-sm text-[#5A6B82]">
          <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5579A8]" />
          Computing FFT on your signal...
        </div>
      )}

      {/* Technical Explanation */}
      <div className="eng-card">
        <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#5579A8]" />
          Discrete Fourier Transform & Spectral Leakage Principles
        </h3>
        <p className="text-xs text-[#5A6B82] leading-relaxed">
          The FFT transforms discrete sampled signals x[n] from the time domain into frequency-domain harmonic coefficients X[k].
          When rectangular windowing is applied to finite-duration vehicle signals, abrupt truncation creates artificial side-lobes known as <strong>spectral leakage</strong>.
          Applying bell-shaped tapering windows (e.g. <strong>Hann</strong> or <strong>Blackman</strong>) smoothly scales boundary samples to zero, suppressing false frequency artifacts and isolating vehicle suspension resonance peaks.
        </p>
      </div>
    </div>
  );
};
