import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
} from 'lucide-react';
import {
  UserSignalData,
  userSignalWindow,
  userSignalPredict,
  UserSignalWindowResponse,
  PredictResponse,
} from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';

interface MonitoringPageProps {
  userSignal: UserSignalData | null;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({ userSignal }) => {
  const [windowIdx, setWindowIdx] = useState<number>(0);
  const [windowDur, setWindowDur] = useState<number>(0.5);

  const [signalData, setSignalData] = useState<UserSignalWindowResponse | null>(null);
  const [prediction, setPrediction] = useState<(PredictResponse & { total_windows?: number }) | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch signal window & prediction when selection changes
  useEffect(() => {
    if (!userSignal) return;
    setLoading(true);
    setError(null);

    Promise.all([
      userSignalWindow({
        signal: userSignal.signal,
        fs: userSignal.fs,
        window_idx: windowIdx,
        window_duration_s: windowDur,
      }),
      userSignalPredict({
        signal: userSignal.signal,
        fs: userSignal.fs,
        window_idx: windowIdx,
        window_duration_s: windowDur,
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
  }, [userSignal, windowIdx, windowDur]);

  // No user signal — show guidance
  if (!userSignal) {
    return (
      <div className="space-y-6">
        <div className="border-b border-[#E2E6EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            Road Monitoring
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5">
            100 Hz IMU vibration window inspection and supervised road condition classification.
          </p>
        </div>

        <div className="eng-card p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-[#5579A8] mx-auto" />
          <h2 className="text-lg font-semibold text-[#253247]">No Signal Data Loaded</h2>
          <p className="text-sm text-[#5A6B82] max-w-lg mx-auto">
            Go to the <strong>Overview</strong> page, paste or upload your vibration data, and click <strong>"Analyse Road"</strong>.
            Once analyzed, your signal data will automatically flow here for windowed monitoring and classification.
          </p>
          <div className="pt-2 text-xs text-[#8492A6]">
            The Road Monitoring page operates on the signal you provide on the main page — no pre-loaded dataset is used.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-[#E2E6EC] shadow-xs">
        <AlertTriangle className="w-8 h-8 text-[#C62828] mx-auto mb-2" />
        <h3 className="text-[#253247] font-semibold text-base mb-1">Signal Processing Error</h3>
        <p className="text-sm text-[#5A6B82]">{error}</p>
      </div>
    );
  }

  const predictedClass = prediction ? prediction.predicted_class : null;
  const isPothole = predictedClass ? predictedClass.toUpperCase().includes('POTHOLE') : false;
  const isSmooth = predictedClass ? predictedClass.toUpperCase().includes('SMOOTH') : false;

  const totalWindows = signalData?.total_windows || 1;

  return (
    <div className="space-y-6">
      {/* Page Heading & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EC] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            Road Monitoring
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5">
            Windowed vibration inspection and supervised road condition classification on your input signal.
          </p>
        </div>
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

      {/* Control Toolbar */}
      <div className="eng-card py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
              <option value="0.25">0.25 s ({Math.round(userSignal.fs * 0.25)} samples @ {userSignal.fs} Hz)</option>
              <option value="0.5">0.50 s ({Math.round(userSignal.fs * 0.5)} samples @ {userSignal.fs} Hz)</option>
              <option value="1.0">1.00 s ({Math.round(userSignal.fs * 1.0)} samples @ {userSignal.fs} Hz)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Signal Source
            </label>
            <div className="px-3 py-1.5 rounded border border-[#E2E6EC] bg-[#F7F8FA] text-xs text-[#253247] font-mono">
              {userSignal.filename} ({userSignal.channel})
            </div>
          </div>

          {/* Window Navigation Controls */}
          <div>
            <label className="block text-xs font-medium text-[#5A6B82] mb-1">
              Window {windowIdx + 1} of {totalWindows}
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
                max={Math.max(0, totalWindows - 1)}
                value={windowIdx}
                onChange={(e) => setWindowIdx(parseInt(e.target.value))}
                className="w-full accent-[#5579A8] cursor-pointer"
              />

              <button
                disabled={windowIdx >= totalWindows - 1}
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
              Windowed Waveform: {userSignal.filename} — Segment {windowIdx + 1}
            </span>
            <span>Sampling: {userSignal.fs} Hz | Interval: {(1000 / userSignal.fs).toFixed(1)} ms</span>
          </div>

          {signalData ? (
            <OscilloscopeCanvas
              timeData={signalData.time_s}
              accelData={signalData.accel_g}
              title={`Vibration Acceleration — ${userSignal.channel}`}
              height={320}
              lineColor="#5579A8"
            />
          ) : (
            <div className="h-[320px] rounded-lg border border-[#E2E6EC] bg-white flex items-center justify-center text-xs text-[#8492A6]">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-spin text-[#5579A8]" />
                  Processing signal window...
                </div>
              ) : 'No telemetry data loaded.'}
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
                {predictedClass ? (
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
                    {predictedClass.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="badge-clean text-xs text-[#8492A6]">
                    Awaiting Model Inference...
                  </span>
                )}
              </div>
            </div>

            {/* Model Prediction Details */}
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
                <span className="text-[#5A6B82]">Data Source</span>
                <span className="font-mono text-[#253247]">
                  User Input ({userSignal.filename})
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
