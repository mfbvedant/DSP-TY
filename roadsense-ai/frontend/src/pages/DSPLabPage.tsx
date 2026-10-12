import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Activity, Layers, Info } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-[#E2E6EC] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
          DSP Laboratory
        </h1>
        <p className="text-xs text-[#5A6B82] mt-0.5">
          Design, tune, and evaluate digital FIR (windowed sinc) and IIR (Butterworth SOS) filters on continuous vibration streams.
        </p>
      </div>

      {/* Control Console */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Signal Stream</label>
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
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
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Filter Family</label>
            <div className="flex rounded border border-[#E2E6EC] bg-[#F7F8FA] p-0.5">
              <button
                type="button"
                onClick={() => {
                  setFilterFamily('FIR');
                  setOrder(51);
                }}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  filterFamily === 'FIR'
                    ? 'bg-white text-[#5579A8] font-semibold shadow-xs'
                    : 'text-[#5A6B82] hover:text-[#253247]'
                }`}
              >
                FIR (Linear)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterFamily('IIR');
                  setOrder(4);
                }}
                className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                  filterFamily === 'IIR'
                    ? 'bg-white text-[#5579A8] font-semibold shadow-xs'
                    : 'text-[#5A6B82] hover:text-[#253247]'
                }`}
              >
                IIR (Butterworth)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">Filter Topology</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="clean-select w-full"
            >
              <option value="lowpass">Low-Pass Filter (LPF)</option>
              <option value="highpass">High-Pass Filter (HPF)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#5A6B82] mb-1">
              <span>Cutoff Frequency</span>
              <span className="font-semibold text-[#253247]">{cutoff} Hz</span>
            </div>
            <input
              type="range"
              min={1}
              max={45}
              step={0.5}
              value={cutoff}
              onChange={(e) => setCutoff(parseFloat(e.target.value))}
              className="w-full accent-[#5579A8] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-[#5A6B82] mb-1">
              <span>Filter Order</span>
              <span className="font-semibold text-[#253247]">
                {order} {filterFamily === 'FIR' ? 'taps' : 'poles'}
              </span>
            </div>
            <input
              type="range"
              min={filterFamily === 'FIR' ? 11 : 2}
              max={filterFamily === 'FIR' ? 91 : 8}
              step={filterFamily === 'FIR' ? 2 : 1}
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value))}
              className="w-full accent-[#5579A8] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded border border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828] text-xs">
          Filter Computation Error: {error}
        </div>
      )}

      {/* Metrics Summary Strip */}
      {filterRes && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Raw RMS</div>
            <div className="text-xl font-bold text-[#253247] mt-1">{filterRes.metrics.rms_raw.toFixed(3)} g</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Pre-filtered baseline</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Filtered RMS</div>
            <div className="text-xl font-bold text-[#2E7D32] mt-1">{filterRes.metrics.rms_filtered.toFixed(3)} g</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Post-filter signal</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Attenuation</div>
            <div className="text-xl font-bold text-[#5579A8] mt-1">{filterRes.metrics.attenuation_pct.toFixed(1)}%</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">High-frequency reduction</div>
          </div>

          <div className="eng-card py-3">
            <div className="text-[11px] text-[#8492A6] font-medium uppercase tracking-wide">Peak Deflection</div>
            <div className="text-xl font-bold text-[#253247] mt-1">{filterRes.metrics.peak_filtered.toFixed(3)} g</div>
            <div className="text-xs text-[#5A6B82] mt-0.5">Raw Peak: {filterRes.metrics.peak_raw.toFixed(3)} g</div>
          </div>
        </div>
      )}

      {/* Waveform Displays: Raw vs Filtered */}
      {filterRes && (
        <div className="space-y-4">
          <OscilloscopeCanvas
            timeData={filterRes.time_s}
            accelData={filterRes.raw_accel_g}
            title={`Raw Unfiltered Signal (${selectedRun})`}
            lineColor="#8492A6"
            height={220}
          />

          <OscilloscopeCanvas
            timeData={filterRes.time_s}
            accelData={filterRes.filtered_accel_g}
            title={`Filtered Signal (${filterFamily} ${filterType.toUpperCase()} — Cutoff: ${cutoff} Hz, Order: ${order})`}
            lineColor="#5579A8"
            height={220}
          />
        </div>
      )}

      {/* DSP Theory Card */}
      <div className="eng-card">
        <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#5579A8]" />
          Filter Architecture & Signal Integrity Foundations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#5A6B82] leading-relaxed">
          <div>
            <strong className="text-[#253247]">FIR Linear Phase:</strong> Windowed-sinc impulse response guarantees constant group delay across all frequency components. Pothole peak timings remain strictly unshifted in time.
          </div>
          <div>
            <strong className="text-[#253247]">IIR Butterworth (SOS):</strong> Maximally flat passband with zero ripple. Second-Order Sections (SOS) structure avoids coefficient roundoff instability at sharp cutoffs.
          </div>
          <div>
            <strong className="text-[#253247]">Zero-Phase Filtering:</strong> Forward-backward bidirectional filtering cancels all phase distortion, ensuring true physical synchronization with vehicle chassis displacement.
          </div>
        </div>
      </div>
    </div>
  );
};
