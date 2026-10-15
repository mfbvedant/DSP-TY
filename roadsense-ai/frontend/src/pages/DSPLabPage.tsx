import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Activity, Info, AlertCircle } from 'lucide-react';
import { UserSignalData, userSignalFilter, FilterResponse } from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';

interface DSPLabPageProps {
  userSignal: UserSignalData | null;
}

export const DSPLabPage: React.FC<DSPLabPageProps> = ({ userSignal }) => {
  const [filterFamily, setFilterFamily] = useState<'FIR' | 'IIR'>('FIR');
  const [filterType, setFilterType] = useState<string>('lowpass');
  const [cutoff, setCutoff] = useState<number>(12.0);
  const [order, setOrder] = useState<number>(51);

  const [filterRes, setFilterRes] = useState<FilterResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const nyquistHz = userSignal ? userSignal.fs / 2 : 50;
  const maxCutoff = Math.floor(nyquistHz - 1);

  const handleApplyFilter = () => {
    if (!userSignal) return;
    setLoading(true);
    setError(null);

    userSignalFilter({
      signal: userSignal.signal,
      fs: userSignal.fs,
      filter_family: filterFamily,
      filter_type: filterType,
      cutoff: Math.min(cutoff, maxCutoff),
      order,
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

  // Auto-apply when signal or filter params change
  useEffect(() => {
    if (userSignal) {
      handleApplyFilter();
    }
  }, [userSignal, filterFamily, filterType, cutoff, order]);

  // No user signal — show guidance
  if (!userSignal) {
    return (
      <div className="space-y-6">
        <div className="border-b border-[#E2E6EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            DSP Laboratory
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5">
            Design, tune, and evaluate digital FIR (windowed sinc) and IIR (Butterworth SOS) filters on vibration streams.
          </p>
        </div>

        <div className="eng-card p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#5579A8] mx-auto" />
          <h2 className="text-lg font-semibold text-[#253247]">No Signal Data Loaded</h2>
          <p className="text-sm text-[#5A6B82] max-w-lg mx-auto">
            Go to the <strong>Overview</strong> page, paste or upload your vibration data, and click <strong>"Analyse Road"</strong>.
            Once analyzed, your signal data will automatically flow here for interactive filter design.
          </p>
          <div className="pt-2 text-xs text-[#8492A6]">
            The DSP Lab operates on the signal you provide on the main page — no pre-loaded dataset is used.
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
          DSP Laboratory
        </h1>
        <p className="text-xs text-[#5A6B82] mt-0.5">
          Design, tune, and evaluate digital FIR (windowed sinc) and IIR (Butterworth SOS) filters on continuous vibration streams.
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

      {/* Control Console */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
              max={maxCutoff}
              step={0.5}
              value={cutoff}
              onChange={(e) => setCutoff(parseFloat(e.target.value))}
              className="w-full accent-[#5579A8] cursor-pointer"
            />
            <div className="text-[10px] text-[#8492A6] mt-0.5">Nyquist: {nyquistHz} Hz</div>
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
            title={`Raw Unfiltered Signal (${userSignal.filename})`}
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

      {loading && !filterRes && (
        <div className="eng-card p-8 text-center text-sm text-[#5A6B82]">
          <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-[#5579A8]" />
          Applying {filterFamily} {filterType} filter to your signal...
        </div>
      )}

      {/* Diagnostic & Hazard Identification Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LPF vs HPF & FIR Mechanics */}
        <div className="eng-card">
          <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#5579A8]" />
            What Changes When Switching Low-Pass vs High-Pass?
          </h3>
          <div className="space-y-2.5 text-xs text-[#5A6B82] leading-relaxed">
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">Low-Pass Filter (e.g. Cutoff &lt; 15 Hz):</strong>
              Preserves slow body heave, suspension rebound, and road slope (0–5 Hz). It filters out tire road-hiss and MEMS sensor noise, but <em>dampens and blurs</em> the sharp transient edge of a pothole impact.
            </div>
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">High-Pass Filter (e.g. Cutoff &gt; 15 Hz):</strong>
              Strips away vehicle pitch, roll, and DC gravity ($1g$), flattening baseline motion to zero. This makes the sudden, violent tire-rim strike of a pothole <strong>pop out as an unmistakable, isolated impulse spike</strong>.
            </div>
            <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
              <strong className="text-[#253247] block mb-1">FIR Mechanics (Feedforward Taps):</strong>
              FIR filters calculate <code>y[n] = Σ b[k] · x[n-k]</code> (for k = 0 to M-1) with no feedback poles. Because the coefficients are symmetric (b[k] = b[M-1-k]), all frequencies travel at identical speeds (linear phase). With zero-phase bidirectional filtering, the pothole impact peak is <strong>100% physically synchronized with time</strong> with zero phase delay.
            </div>
          </div>
        </div>

        {/* How to Determine a Pothole on the Filter Graph */}
        <div className="eng-card border-l-4 border-l-[#C62828]">
          <h3 className="text-sm font-semibold text-[#253247] mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#C62828]" />
            How to Determine There is a Pothole from the Filter Graph
          </h3>
          <div className="space-y-2 text-xs text-[#5A6B82] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <div>
                <strong className="text-[#253247]">Biphasic Shock Waveform:</strong>
                First, a sudden <em>drop below baseline</em> (free-fall / de-weighting as the tire drops into the void), followed immediately by a sharp <em>positive spike</em> ($+1.5g$ to $+2.5g$) as the rim impacts the opposite lip.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <div>
                <strong className="text-[#253247]">Elevated Crest Factor (Peak / RMS &gt; 3.5):</strong>
                Unlike smooth road vibrations where energy is evenly distributed (Crest Factor ~ 1.5–2.5), a pothole concentrates violent energy in a single millisecond impulse, causing a dramatic Crest Factor spike.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFEBEE] text-[#C62828] font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <div>
                <strong className="text-[#253247]">Pothole vs Speed Bump in Waveform:</strong>
                A <em>speed bump</em> begins with a smooth upward positive compression followed by gradual settling. A <em>pothole</em> starts with an abrupt negative dip followed by a violent, high-jerk impact spike.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
