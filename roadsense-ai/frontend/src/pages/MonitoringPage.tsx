import React, { useState, useEffect } from 'react';
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Sliders,
} from 'lucide-react';
import {
  fetchRuns,
  fetchSignalWindow,
  predictWindow,
  RunSummary,
  SignalWindowResponse,
  PredictResponse,
} from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';

export const MonitoringPage: React.FC = () => {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [windowIdx, setWindowIdx] = useState<number>(0);
  const [windowDur, setWindowDur] = useState<number>(0.5);
  const [channel, setChannel] = useState<string>('chassis_accel_z_g');

  const [signalData, setSignalData] = useState<SignalWindowResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load runs on mount
  useEffect(() => {
    fetchRuns()
      .then((data) => {
        setRuns(data);
        if (data.length > 0) setSelectedRun(data[0].run_id);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Fetch signal window & prediction when selection changes
  useEffect(() => {
    if (!selectedRun) return;
    setLoading(true);

    Promise.all([
      fetchSignalWindow(selectedRun, windowIdx, windowDur, channel),
      predictWindow({
        run_id: selectedRun,
        window_idx: windowIdx,
        window_duration_s: windowDur,
        channel,
      }).catch(() => null),
    ])
      .then(([sig, pred]) => {
        setSignalData(sig);
        setPrediction(pred);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedRun, windowIdx, windowDur, channel]);

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-[#E2E6EC] shadow-xs">
        <AlertTriangle className="w-8 h-8 text-[#C62828] mx-auto mb-2" />
        <h3 className="text-[#253247] font-semibold text-base mb-1">Telemetry Signal Error</h3>
        <p className="text-sm text-[#5A6B82]">{error}</p>
      </div>
    );
  }

  const currentClass = prediction?.predicted_class || signalData?.hazard_type || 'SMOOTH_HIGHWAY';
  const groundTruth = signalData?.hazard_type || '';
  const isMatch = prediction && groundTruth && prediction.predicted_class.toUpperCase() === groundTruth.toUpperCase();
  const isPothole = currentClass.toUpperCase().includes('POTHOLE');
  const isSmooth = currentClass.toUpperCase().includes('SMOOTH');

  return (
    <div className="space-y-6">
      {/* Page Heading & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EC] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            Road Monitoring
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5">
            100 Hz IMU vibration window inspection and supervised road condition classification.
          </p>
        </div>

        <a
          href={`http://localhost:8000/api/export/signal?run_id=${selectedRun}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E6EC] bg-white text-xs font-medium text-[#253247] hover:bg-[#F7F8FA] transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#5A6B82]" />
          Export Run CSV
        </a>
      </div>

      {/* Control Toolbar */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Simulation Run
            </label>
            <select
              value={selectedRun}
              onChange={(e) => {
                setSelectedRun(e.target.value);
                setWindowIdx(0);
              }}
              className="clean-select w-full"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} — {r.hazard_type} ({r.samples} samples)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Sensor Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="clean-select w-full"
            >
              <option value="chassis_accel_z_g">chassis_accel_z_g (Vertical Acceleration)</option>
              <option value="wheel_displacement_mm">wheel_displacement_mm (Wheel Hub Travel)</option>
              <option value="suspension_deflection_mm">suspension_deflection_mm (Spring Deflection)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Analysis Window Duration
            </label>
            <select
              value={windowDur}
              onChange={(e) => {
                setWindowDur(parseFloat(e.target.value));
                setWindowIdx(0);
              }}
              className="clean-select w-full"
            >
              <option value="0.25">0.25 s (25 samples @ 100 Hz)</option>
              <option value="0.5">0.50 s (50 samples @ 100 Hz)</option>
              <option value="1.0">1.00 s (100 samples @ 100 Hz)</option>
            </select>
          </div>

          {/* Window Navigation Controls */}
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Window {signalData ? `${windowIdx + 1} of ${signalData.total_windows}` : '—'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                disabled={windowIdx <= 0}
                onClick={() => setWindowIdx((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-1.5 rounded border border-[#E2E6EC] bg-white text-xs text-[#253247] hover:bg-[#F7F8FA] disabled:opacity-40 transition-colors"
                title="Previous Window"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0"
                max={signalData ? Math.max(0, signalData.total_windows - 1) : 0}
                value={windowIdx}
                onChange={(e) => setWindowIdx(parseInt(e.target.value))}
                className="w-full accent-[#5579A8] cursor-pointer"
              />

              <button
                disabled={signalData ? windowIdx >= signalData.total_windows - 1 : true}
                onClick={() => setWindowIdx((prev) => prev + 1)}
                className="px-2.5 py-1.5 rounded border border-[#E2E6EC] bg-white text-xs text-[#253247] hover:bg-[#F7F8FA] disabled:opacity-40 transition-colors"
                title="Next Window"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Signal Waveform & Road-Condition Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Waveform Canvas */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#5A6B82]">
            <span className="font-semibold text-[#253247]">
              Windowed Waveform: {selectedRun} — Segment {windowIdx + 1}
            </span>
            <span>Sampling: 100 Hz | Interval: 10 ms</span>
          </div>

          {signalData ? (
            <OscilloscopeCanvas
              timeData={signalData.time_s}
              accelData={signalData.accel_g}
              title={`Vibration Acceleration — ${channel}`}
              height={320}
              lineColor="#5579A8"
            />
          ) : (
            <div className="h-[320px] rounded-lg border border-[#E2E6EC] bg-white flex items-center justify-center text-xs text-[#8492A6]">
              {loading ? 'Processing signal window...' : 'No telemetry data loaded.'}
            </div>
          )}
        </div>

        {/* Right: Road Condition Classification Card */}
        <div className="space-y-4">
          <div className="eng-card space-y-4">
            <div>
              <div className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide">
                Road Condition Classification
              </div>
              <div className="mt-2.5">
                <span
                  className={`badge-clean text-sm font-semibold px-3 py-1.5 ${
                    isPothole
                      ? 'badge-red'
                      : isSmooth
                      ? 'badge-green'
                      : 'badge-amber'
                  }`}
                >
                  {isPothole ? (
                    <AlertTriangle className="w-4 h-4 text-[#C62828]" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                  )}
                  {currentClass.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Comparison of Actual Measurement vs Model Prediction */}
            <div className="space-y-2.5 pt-2 border-t border-[#E2E6EC] text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#5A6B82]">Model Prediction</span>
                <span className="font-semibold text-[#253247]">
                  {prediction ? prediction.predicted_class : 'Evaluating...'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#5A6B82]">Prediction Confidence</span>
                <span className="font-mono font-medium text-[#253247]">
                  {prediction?.confidence
                    ? `${(prediction.confidence * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#5A6B82]">Dataset Label</span>
                <span className="font-mono text-[#253247]">
                  {groundTruth || '—'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#5A6B82]">Prediction Match</span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                    isMatch
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF8E1] text-[#B78103]'
                  }`}
                >
                  {isMatch ? 'Matches Ground Truth' : 'Discrepancy / Holdout'}
                </span>
              </div>
            </div>

            {/* Numerical DSP Measurements */}
            <div className="pt-3 border-t border-[#E2E6EC]">
              <div className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide mb-2.5">
                Vibration Measurements
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                  <div className="text-[#8492A6] text-[11px]">RMS Energy</div>
                  <div className="font-mono font-semibold text-[#253247] mt-0.5">
                    {signalData ? `${signalData.metrics.rms.toFixed(3)} g` : '—'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                  <div className="text-[#8492A6] text-[11px]">Peak Value</div>
                  <div className="font-mono font-semibold text-[#253247] mt-0.5">
                    {signalData ? `${signalData.metrics.peak.toFixed(3)} g` : '—'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                  <div className="text-[#8492A6] text-[11px]">Crest Factor</div>
                  <div className="font-mono font-semibold text-[#253247] mt-0.5">
                    {signalData ? signalData.metrics.crest_factor.toFixed(2) : '—'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                  <div className="text-[#8492A6] text-[11px]">Peak-to-Peak</div>
                  <div className="font-mono font-semibold text-[#253247] mt-0.5">
                    {signalData ? `${signalData.metrics.p2p.toFixed(3)} g` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
