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

      {/* Diagnostic & Hazard Spectral Identification Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Windowing Mechanics */}
        <div className="eng-card">
          <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#5579A8]" />
            What Causes What in FFT & Window Tapering?
          </h3>
          <div className="space-y-2.5 text-xs text-[#5A6B82] leading-relaxed">
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">Spectral Decomposition:</strong>
              The FFT decomposes acceleration into orthogonal harmonic basis functions:
              <code className="block mt-1 font-mono text-[11px] text-[#253247]">X[k] = Σ x[n] · w[n] · e^(-j · 2π · k · n / N)</code>
              Revealing which mechanical resonance modes (chassis bounce, wheel hop, tire impact) are excited.
            </div>
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">Windowing & Spectral Leakage:</strong>
              Abruptly truncating a signal (Rectangular window) creates sharp edges in time, producing high sinc side-lobes (-13 dB) that leak artificial energy into adjacent bins. Tapering windows (<strong>Hann</strong>: -31 dB, <strong>Blackman</strong>: -58 dB) smoothly force endpoints to zero, suppressing false leakage.
            </div>
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">Time-Frequency Uncertainty:</strong>
              Shorter window (0.25 s) gives high time localization for the instant of impact, but coarse frequency resolution (Δf = 4 Hz). Longer window (1.0 s) gives sharp frequency bins (Δf = 1 Hz) but smears transient events over time.
            </div>
          </div>
        </div>

        {/* How to Determine a Pothole on the FFT Graph */}
        <div className="eng-card border-l-4 border-l-[#C62828]">
          <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#C62828]" />
            How to Determine There is a Pothole from the FFT Graph
          </h3>
          <div className="space-y-2 text-xs text-[#5A6B82] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <div>
                <strong className="text-[#253247]">Broadband Impulse Response:</strong>
                A violent tire impact in time approximates an impulse δ(t). In the frequency domain, an impulse has an infinitely wide, flat spectrum (Fourier transform of δ is constant across all frequencies). A pothole causes <strong>energy to surge across ALL frequencies up to the 50 Hz Nyquist limit</strong>.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <div>
                <strong className="text-[#253247]">Elevated High-Band Energy & Centroid:</strong>
                High-frequency band power ($20 - 50$ Hz) spikes dramatically. The <strong>Spectral Centroid</strong> shifts upward into the $18 - 28$ Hz range, and the <strong>Spectral Spread</strong> widens ($\sigma_f &gt; 10$ Hz).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <div>
                <strong className="text-[#253247]">Pothole vs Speed Bump vs Highway in FFT:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1 text-[#5A6B82]">
                  <li><span className="text-[#C62828] font-semibold">Pothole:</span> Broadband energy explosion + heavy high-band content ($20–50$ Hz).</li>
                  <li><span className="text-[#E65100] font-semibold">Speed Bump:</span> Narrow, concentrated peak at low frequency ($1.5–4$ Hz body heave); negligible high-band energy.</li>
                  <li><span className="text-[#2E7D32] font-semibold">Smooth Highway:</span> Low, flat baseline across all bins with no prominent peaks.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
