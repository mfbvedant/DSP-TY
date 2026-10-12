import React, { useState, useEffect } from 'react';
import { BarChart3, Radio, HelpCircle } from 'lucide-react';
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
    <div className="space-y-6 pb-16">
      {/* Title */}
      <div className="border-b border-[#1E2E48] pb-4">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          📈 Fast Fourier Transform (FFT) Analyzer
        </h1>
        <p className="text-xs text-[#95A4BA] mt-0.5">
          Discrete frequency-domain spectral density decomposition, window tapering, and resonant peak tracking.
        </p>
      </div>

      {/* FFT Controls */}
      <div className="cockpit-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Signal Stream</label>
            <select
              value={selectedRun}
              onChange={(e) => {
                setSelectedRun(e.target.value);
                setWinIdx(0);
              }}
              className="w-full bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-2 font-mono focus:border-[#00D4FF] focus:outline-none"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} ({r.hazard_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Window Function</label>
            <select
              value={windowFunc}
              onChange={(e) => setWindowFunc(e.target.value)}
              className="w-full bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-2 font-mono focus:border-[#00D4FF] focus:outline-none"
            >
              <option value="hann">Hann (Recommended — Low Leakage)</option>
              <option value="hamming">Hamming (Narrow Main Lobe)</option>
              <option value="blackman">Blackman (High Stopband Attenuation)</option>
              <option value="boxcar">Boxcar / Rectangular (No Taper)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Window Length</label>
            <select
              value={winDur}
              onChange={(e) => {
                setWinDur(parseFloat(e.target.value));
                setWinIdx(0);
              }}
              className="w-full bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-2 font-mono focus:border-[#00D4FF] focus:outline-none"
            >
              <option value="0.25">0.25 s (25 samples, Δf = 4.0 Hz)</option>
              <option value="0.5">0.50 s (50 samples, Δf = 2.0 Hz)</option>
              <option value="1.0">1.00 s (100 samples, Δf = 1.0 Hz)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#95A4BA] uppercase mb-1">
              <span>Segment Index</span>
              <span className="text-[#00D4FF]">W-{winIdx.toString().padStart(3, '0')}</span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              value={winIdx}
              onChange={(e) => setWinIdx(parseInt(e.target.value))}
              className="w-full accent-[#00D4FF] cursor-pointer mt-2"
            />
          </div>
        </div>
      </div>

      {/* Spectral Indicators */}
      {fftData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Dominant Frequency</div>
            <div className="text-xl font-mono font-bold text-[#FF5364] mt-0.5">{fftData.dominant_freq_hz.toFixed(2)} Hz</div>
            <div className="text-[10px] text-[#718096]">Max resonant peak</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Spectral Centroid</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{fftData.spectral_centroid_hz.toFixed(2)} Hz</div>
            <div className="text-[10px] text-[#718096]">Spectral center-of-mass</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Spectral Spread</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{fftData.spectral_spread_hz.toFixed(2)} Hz</div>
            <div className="text-[10px] text-[#718096]">Bandwidth standard dev</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Resolution (Δf)</div>
            <div className="text-xl font-mono font-bold text-[#DEE2F2] mt-0.5">{fftData.frequency_resolution_hz.toFixed(2)} Hz</div>
            <div className="text-[10px] text-[#718096]">Bin spacing = fs / N</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Nyquist Boundary</div>
            <div className="text-xl font-mono font-bold text-[#DEE2F2] mt-0.5">50.0 Hz</div>
            <div className="text-[10px] text-[#718096]">fs / 2 (no aliasing)</div>
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
          title={`FFT MAGNITUDE SPECTRUM | ${selectedRun} (Window W-${winIdx.toString().padStart(3, '0')}, ${windowFunc.toUpperCase()})`}
          height={320}
        />
      )}

      {/* Multi-Class Spectral Comparison */}
      {Object.keys(classSpectra).length > 0 && (
        <div className="cockpit-card">
          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span>📊</span> Multi-Class Spectral Resonant Signatures
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(classSpectra).map(([cName, sData]) => {
              const peakIdx = sData.magnitude.indexOf(Math.max(...sData.magnitude.slice(1)));
              const peakFreq = sData.freqs[peakIdx] || 0;
              return (
                <div key={cName} className="p-3 rounded bg-[#101827] border border-[#1E2E48]">
                  <div className="font-['Space_Grotesk'] text-xs font-bold text-white mb-1">{cName}</div>
                  <div className="text-[11px] font-mono text-[#00D4FF]">Peak Mode: {peakFreq.toFixed(1)} Hz</div>
                  <div className="text-[10px] text-[#95A4BA] mt-1">
                    {cName.includes('POTHOLE')
                      ? 'Transient shock mode'
                      : cName.includes('SMOOTH')
                      ? 'Low body heave mode'
                      : 'Broadband road chatter'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Explanation */}
      <div className="cockpit-card">
        <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#00D4FF] mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          Discrete Fourier Transform & Spectral Leakage Principles
        </h3>
        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          The FFT transforms discrete sampled signals $x[n]$ from the time domain into frequency-domain harmonic coefficients $X[k]$.
          When rectangular windowing is applied to finite-duration vehicle signals, abrupt truncation creates artificial side-lobes known as <strong>spectral leakage</strong>.
          Applying bell-shaped tapering windows (e.g. <strong>Hann</strong> or <strong>Blackman</strong>) smoothly scales boundary samples to zero, suppressing false frequency artifacts and isolating vehicle suspension resonance peaks.
        </p>
      </div>
    </div>
  );
};
