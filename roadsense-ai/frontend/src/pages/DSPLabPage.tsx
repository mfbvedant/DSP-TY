import React, { useState, useEffect } from 'react';
import { Sliders, Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchRuns, runFilter, RunSummary, FilterResponse } from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';

export const DSPLabPage: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [filterFamily, setFilterFamily] = useState<'FIR' | 'IIR'>('FIR');
  const [filterType, setFilterType] = useState<string>('lowpass');
  const [cutoff, setCutoff] = useState<number>(12.0);
  const [order, setOrder] = useState<number>(51);
  const [channel, setChannel] = useState<string>('chassis_accel_z_g');

  const [filterRes, setFilterRes] = useState<FilterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns().then((data) => {
      setRuns(data);
      if (data.length > 0) setSelectedRun(data[0].run_id);
    });
  }, []);

  const handleApplyFilter = () => {
    if (!selectedRun) return;
    setLoading(true);
    setError(null);

    runFilter({
      run_id: selectedRun,
      filter_family: filterFamily,
      filter_type: filterType,
      cutoff,
      order,
      channel,
    })
      .then((res) => {
        setFilterRes(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (selectedRun) handleApplyFilter();
  }, [selectedRun, filterFamily, filterType, cutoff, order, channel]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Title */}
      <div className="border-b border-[#1E2E48] pb-4">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          🔬 Digital Signal Processing Laboratory
        </h1>
        <p className="text-xs text-[#95A4BA] mt-0.5">
          Design, tune, and benchmark FIR (windowed sinc) & IIR (Butterworth SOS) digital filters on continuous vibration streams.
        </p>
      </div>

      {/* Control Console */}
      <div className="cockpit-card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Signal Stream</label>
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
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
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Filter Family</label>
            <div className="flex rounded bg-[#101827] border border-[#1E2E48] p-0.5">
              <button
                onClick={() => {
                  setFilterFamily('FIR');
                  setOrder(51);
                }}
                className={`flex-1 py-1 text-xs font-mono rounded transition-all ${
                  filterFamily === 'FIR' ? 'bg-[#00D4FF] text-[#080D18] font-bold' : 'text-[#95A4BA]'
                }`}
              >
                FIR (Linear)
              </button>
              <button
                onClick={() => {
                  setFilterFamily('IIR');
                  setOrder(4);
                }}
                className={`flex-1 py-1 text-xs font-mono rounded transition-all ${
                  filterFamily === 'IIR' ? 'bg-[#00D4FF] text-[#080D18] font-bold' : 'text-[#95A4BA]'
                }`}
              >
                IIR (Butterworth)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Topology</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-2 font-mono focus:border-[#00D4FF] focus:outline-none"
            >
              <option value="lowpass">Low-Pass Filter (LPF)</option>
              <option value="highpass">High-Pass Filter (HPF)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#95A4BA] uppercase mb-1">
              <span>Cutoff (Hz)</span>
              <span className="text-[#00D4FF] font-bold">{cutoff} Hz</span>
            </div>
            <input
              type="range"
              min={1}
              max={45}
              step={0.5}
              value={cutoff}
              onChange={(e) => setCutoff(parseFloat(e.target.value))}
              className="w-full accent-[#00D4FF] cursor-pointer mt-1"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#95A4BA] uppercase mb-1">
              <span>Order / Taps</span>
              <span className="text-[#00D4FF] font-bold">{order} {filterFamily === 'FIR' ? 'taps' : 'order'}</span>
            </div>
            <input
              type="range"
              min={filterFamily === 'FIR' ? 11 : 2}
              max={filterFamily === 'FIR' ? 91 : 8}
              step={filterFamily === 'FIR' ? 2 : 1}
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value))}
              className="w-full accent-[#00D4FF] cursor-pointer mt-1"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-[#FF5364]/10 border border-[#FF5364]/40 text-[#FF5364] text-xs font-mono">
          ⚠️ Filter Error: {error}
        </div>
      )}

      {/* Metrics Summary Strip */}
      {filterRes && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Raw RMS</div>
            <div className="text-lg font-mono font-bold text-[#DEE2F2] mt-0.5">{filterRes.metrics.rms_raw.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Pre-filtered baseline</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Filtered RMS</div>
            <div className="text-lg font-mono font-bold text-[#10B981] mt-0.5">{filterRes.metrics.rms_filtered.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Post-filter signal</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Attenuation</div>
            <div className="text-lg font-mono font-bold text-[#00D4FF] mt-0.5">{filterRes.metrics.attenuation_pct.toFixed(1)}%</div>
            <div className="text-[10px] text-[#718096]">Band energy reduced</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Peak Deflection</div>
            <div className="text-lg font-mono font-bold text-[#FFB547] mt-0.5">{filterRes.metrics.peak_filtered.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Raw: {filterRes.metrics.peak_raw.toFixed(3)}g</div>
          </div>
        </div>
      )}

      {/* Waveform Displays: Raw vs Filtered */}
      {filterRes && (
        <div className="space-y-4">
          <OscilloscopeCanvas
            timeData={filterRes.time_s}
            accelData={filterRes.raw_accel_g}
            title={`RAW UNFILTERED SIGNAL | ${selectedRun}`}
            lineColor="#718096"
            height={220}
          />

          <OscilloscopeCanvas
            timeData={filterRes.time_s}
            accelData={filterRes.filtered_accel_g}
            title={`FILTERED SIGNAL | ${filterFamily} ${filterType.toUpperCase()} (${cutoff} Hz, Order ${order})`}
            lineColor="#00D4FF"
            height={220}
          />
        </div>
      )}

      {/* DSP Theory Card */}
      <div className="cockpit-card">
        <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#00D4FF] mb-2">
          📐 Filter Architecture & Signal Integrity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] leading-relaxed">
          <div>
            <strong className="text-white">FIR Linear Phase:</strong> Windowed-sinc impulse response guarantees constant group delay across all frequency components. Pothole peak timings remain strictly unshifted.
          </div>
          <div>
            <strong className="text-white">IIR Butterworth (SOS):</strong> Maximally flat passband with zero ripple. Second-Order Sections (SOS) structure avoids coefficient roundoff instability at sharp cutoffs.
          </div>
          <div>
            <strong className="text-white">Zero-Phase Filtering:</strong> Forward-backward bidirectional filtering cancels all phase distortion, ensuring true physical synchronization with vehicle chassis displacement.
          </div>
        </div>
      </div>
    </div>
  );
};
