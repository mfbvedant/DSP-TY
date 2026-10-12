import React, { useState, useEffect } from 'react';
import { Download, AlertTriangle, CheckCircle, Flame, RefreshCw } from 'lucide-react';
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
      <div className="p-8 text-center bg-[#101827] rounded-lg border border-[#FF5364]/40">
        <AlertTriangle className="w-8 h-8 text-[#FF5364] mx-auto mb-2" />
        <h3 className="text-white font-bold text-lg mb-1">Telemetry Signal Error</h3>
        <p className="text-sm text-[#95A4BA]">{error}</p>
      </div>
    );
  }

  const currentClass = prediction?.predicted_class || signalData?.hazard_type || 'SMOOTH';
  const isPothole = currentClass.toUpperCase().includes('POTHOLE');
  const isRough = currentClass.toUpperCase().includes('ROUGH') || currentClass.toUpperCase().includes('BUMP') || currentClass.toUpperCase().includes('SWERVE');

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header & Telemetry Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2E48] pb-4">
        <div>
          <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            📡 Road Telemetry & Condition Monitor
          </h1>
          <p className="text-xs text-[#95A4BA] mt-0.5">
            Active 100 Hz IMU vibration window inspector & machine-learning classification telemetry.
          </p>
        </div>

        {/* Telemetry Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Simulation Run</label>
            <select
              value={selectedRun}
              onChange={(e) => {
                setSelectedRun(e.target.value);
                setWindowIdx(0);
              }}
              className="bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-1.5 focus:border-[#00D4FF] focus:outline-none font-mono"
            >
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} ({r.hazard_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">IMU Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-1.5 focus:border-[#00D4FF] focus:outline-none font-mono"
            >
              <option value="chassis_accel_z_g">chassis_accel_z_g</option>
              <option value="wheel_displacement_mm">wheel_displacement_mm</option>
              <option value="suspension_deflection_mm">suspension_deflection_mm</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#95A4BA] uppercase mb-1">Window Duration</label>
            <select
              value={windowDur}
              onChange={(e) => {
                setWindowDur(parseFloat(e.target.value));
                setWindowIdx(0);
              }}
              className="bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-3 py-1.5 focus:border-[#00D4FF] focus:outline-none font-mono"
            >
              <option value="0.25">0.25 s (25 pts)</option>
              <option value="0.5">0.50 s (50 pts)</option>
              <option value="1.0">1.00 s (100 pts)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prominent Road Condition Alert Banner */}
      <div
        className={`rounded-lg p-5 border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isPothole
            ? 'bg-gradient-to-r from-[#FF5364]/20 to-[#141E30] border-[#FF5364] shadow-[0_0_24px_rgba(255,83,100,0.2)]'
            : isRough
            ? 'bg-gradient-to-r from-[#FFB547]/20 to-[#141E30] border-[#FFB547]'
            : 'bg-gradient-to-r from-[#10B981]/15 to-[#141E30] border-[#10B981]/50'
        }`}
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            {isPothole ? (
              <Flame className="w-6 h-6 text-[#FF5364] animate-pulse" />
            ) : isRough ? (
              <AlertTriangle className="w-6 h-6 text-[#FFB547]" />
            ) : (
              <CheckCircle className="w-6 h-6 text-[#10B981]" />
            )}
            <span className="font-['Space_Grotesk'] text-2xl font-bold tracking-wide text-white">
              {currentClass.toUpperCase()}
            </span>

            {prediction?.confidence && (
              <span className="hud-pill pill-cyan">
                CONFIDENCE: {(prediction.confidence * 100).toFixed(1)}%
              </span>
            )}
          </div>

          <p className="text-xs text-[#CBD5E1] max-w-xl">
            {isPothole
              ? 'Severe transient shock detected. Vertical acceleration spike exceeds suspension rebound limit.'
              : isRough
              ? 'Elevated continuous chatter detected. Broad vibration bandwidth with elevated RMS energy.'
              : 'Nominal pavement surface. Vertical acceleration remains within baseline threshold.'}
          </p>
          <p className="text-[10px] text-[#95A4BA] mt-1 italic">
            *Ground Truth Tag: {signalData?.hazard_type || 'N/A'} | Note: Pothole-like events represent impulsive impact signatures.
          </p>
        </div>

        <div className="font-mono text-xs text-right text-[#95A4BA] self-end md:self-center">
          <div>WINDOW: W-{windowIdx.toString().padStart(3, '0')} / {((signalData?.total_windows || 1) - 1).toString().padStart(3, '0')}</div>
          {signalData && signalData.time_s.length > 0 && (
            <div className="text-[#00D4FF] font-semibold mt-1">
              Time: {signalData.time_s[0].toFixed(2)}s – {signalData.time_s[signalData.time_s.length - 1].toFixed(2)}s
            </div>
          )}
        </div>
      </div>

      {/* Window Slider Bar */}
      {signalData && signalData.total_windows > 1 && (
        <div className="cockpit-card py-3 px-4">
          <div className="flex justify-between items-center text-xs font-mono text-[#95A4BA] mb-2">
            <span>SLIDING WINDOW SELECTOR</span>
            <span className="text-[#00D4FF]">WINDOW W-{windowIdx.toString().padStart(3, '0')}</span>
          </div>
          <input
            type="range"
            min={0}
            max={signalData.total_windows - 1}
            value={windowIdx}
            onChange={(e) => setWindowIdx(parseInt(e.target.value))}
            className="w-full accent-[#00D4FF] cursor-pointer"
          />
        </div>
      )}

      {/* Signal Metric Pods Grid */}
      {signalData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">RMS Energy</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{signalData.metrics.rms.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Signal amplitude</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Peak Absolute</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{signalData.metrics.peak.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Max shock deflection</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Peak-to-Peak</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{signalData.metrics.p2p.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Total deflection span</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Crest Factor</div>
            <div
              className={`text-xl font-mono font-bold mt-0.5 ${
                signalData.metrics.crest_factor > 4.0 ? 'text-[#FF5364]' : 'text-[#00D4FF]'
              }`}
            >
              {signalData.metrics.crest_factor.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#718096]">Impulsive shock ratio</div>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <div className="text-[10px] font-mono text-[#95A4BA] uppercase">Std Dev (σ)</div>
            <div className="text-xl font-mono font-bold text-[#00D4FF] mt-0.5">{signalData.metrics.std.toFixed(3)} g</div>
            <div className="text-[10px] text-[#718096]">Variance spread</div>
          </div>
        </div>
      )}

      {/* Oscilloscope Waveform Canvas */}
      {signalData && (
        <OscilloscopeCanvas
          timeData={signalData.time_s}
          accelData={signalData.accel_g}
          title={`CHASSIS ACCELERATION (Z-AXIS) | ${selectedRun} W-${windowIdx.toString().padStart(3, '0')}`}
          warningLimit={1.8}
          height={320}
        />
      )}

      {/* Classifier Probability Breakdown */}
      {prediction?.probabilities && (
        <div className="cockpit-card">
          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-3">
            📊 Model Class Probability Distribution
          </h3>
          <div className="space-y-2">
            {prediction.all_classes.map((clsName, idx) => {
              const prob = prediction.probabilities![idx];
              const pct = (prob * 100).toFixed(1);
              const isHighlight = clsName === prediction.predicted_class;
              return (
                <div key={clsName} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className={isHighlight ? 'text-[#00D4FF] font-bold' : 'text-[#95A4BA]'}>
                      {clsName}
                    </span>
                    <span className="text-white font-semibold">{pct}%</span>
                  </div>
                  <div className="w-full bg-[#101827] h-2 rounded-full overflow-hidden border border-[#1E2E48]">
                    <div
                      className={`h-full transition-all duration-300 ${
                        clsName.includes('POTHOLE')
                          ? 'bg-[#FF5364]'
                          : clsName.includes('ROUGH')
                          ? 'bg-[#FFB547]'
                          : 'bg-[#10B981]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
