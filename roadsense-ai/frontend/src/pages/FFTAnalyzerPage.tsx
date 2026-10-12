import React, { useState, useEffect } from 'react';
import { BarChart3, HelpCircle, Layers, Activity } from 'lucide-react';
import { fetchRuns, runFFT, fetchSpectralClasses, RunSummary, FFTResponse } from '../api';
import { FFTCanvas } from '../components/FFTCanvas';

export const FFTAnalyzerPage: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [winIdx, setWinIdx] = useState<number>(0);
  const [winDur, setWinDur] = useState<number>(0.5);
  const [windowFunc, setWindowFunc] = useState<string>('hann');

  const [fftData, setFftData] = useState<FFTResponse | null>(null);
  const [classSpectra, setClassSpectra] = useState<Record<string, { freqs: number[]; magnitude: number[] }>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRuns().then((data) => {
      setRuns(data);
      if (data.length > 0) setSelectedRun(data[0].run_id);
    });
    fetchSpectralClasses().then((cs) => setClassSpectra(cs)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRun) return;
    setLoading(true);

    runFFT({
      run_id: selectedRun,
      window_idx: winIdx,
      window_duration_s: winDur,
      window_function: windowFunc,
    })
      .then((res) => {
        setFftData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedRun, winIdx, winDur, windowFunc]);

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

      {/* FFT Controls */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Signal Stream</label>
            <select
              value={selectedRun}
              onChange={(e) => {
                setSelectedRun(e.target.value);
                setWinIdx(0);
              }}
              className="clean-select w-full"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} ({r.hazard_type})
                </option>
              ))}
            </select>
          </div>

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
              <option value="0.25">0.25 s (25 samples, Δf = 4.0 Hz)</option>
              <option value="0.5">0.50 s (50 samples, Δf = 2.0 Hz)</option>
              <option value="1.0">1.00 s (100 samples, Δf = 1.0 Hz)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#5A6B82] mb-1">
              <span>Segment Index</span>
              <span className="font-semibold text-[#253247]">Index: {winIdx}</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
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
            <div className="text-xl font-bold text-[#253247] mt-1">50.0 Hz</div>
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
          nyquistFreq={50.0}
          title={`FFT Magnitude Spectrum — ${selectedRun} (Window ${winIdx}, ${windowFunc.toUpperCase()} Taper)`}
          height={320}
        />
      )}

      {/* Multi-Class Spectral Comparison */}
      {Object.keys(classSpectra).length > 0 && (
        <div className="eng-card">
          <h3 className="text-sm font-semibold text-[#253247] mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#5579A8]" />
            Multi-Class Spectral Resonant Signatures
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(classSpectra).map(([cName, sData]) => {
              const peakIdx = sData.magnitude.indexOf(Math.max(...sData.magnitude.slice(1)));
              const peakFreq = sData.freqs[peakIdx] || 0;
              return (
                <div key={cName} className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                  <div className="text-xs font-semibold text-[#253247]">{cName.replace('_', ' ')}</div>
                  <div className="text-sm font-bold text-[#5579A8] mt-1">Peak: {peakFreq.toFixed(1)} Hz</div>
                  <div className="text-[11px] text-[#5A6B82] mt-0.5">
                    {cName.includes('POTHOLE')
                      ? 'Transient shock mode'
                      : cName.includes('SMOOTH')
                      ? 'Low body heave mode'
                      : 'Broadband road excitation'}
                  </div>
                </div>
              );
            })}
          </div>
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
