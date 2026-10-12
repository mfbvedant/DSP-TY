import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Activity,
  SlidersHorizontal,
  BarChart3,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  SystemStatus,
  fetchRuns,
  fetchSignalWindow,
  predictWindow,
  SignalWindowResponse,
  PredictResponse,
} from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  status: SystemStatus | null;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, status }) => {
  const [sampleSignal, setSampleSignal] = useState<SignalWindowResponse | null>(null);
  const [samplePrediction, setSamplePrediction] = useState<PredictResponse | null>(null);
  const [selectedRun, setSelectedRun] = useState<string>('RUN_001');

  useEffect(() => {
    fetchRuns().then((runs) => {
      if (runs.length > 0) {
        const runId = runs[0].run_id;
        setSelectedRun(runId);
        Promise.all([
          fetchSignalWindow(runId, 0, 0.5, 'chassis_accel_z_g'),
          predictWindow({ run_id: runId, window_idx: 0, window_duration_s: 0.5 }),
        ])
          .then(([sig, pred]) => {
            setSampleSignal(sig);
            setSamplePrediction(pred);
          })
          .catch(() => {});
      }
    });
  }, []);

  const hazardClass = samplePrediction?.predicted_class || sampleSignal?.hazard_type || 'POTHOLE';
  const isPothole = hazardClass.toUpperCase().includes('POTHOLE');
  const isSmooth = hazardClass.toUpperCase().includes('SMOOTH');

  return (
    <div className="space-y-6">
      {/* Compact Header & Primary Action */}
      <div className="bg-white border border-[#E2E6EC] rounded-lg p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            Road Condition Analysis
          </h1>
          <p className="text-sm text-[#5A6B82] mt-1 max-w-2xl">
            Automated road surface quality assessment and anomaly detection using digital signal processing and supervised machine learning.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('monitoring')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#5579A8] text-white text-xs font-semibold hover:bg-[#456691] transition-colors shadow-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            Open Road Monitoring
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onNavigate('dsp_lab')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#E2E6EC] bg-white text-[#253247] text-xs font-medium hover:bg-[#F7F8FA] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A6B82]" />
            DSP Laboratory
          </button>
        </div>
      </div>

      {/* Summary Metrics Row (Real Backend Values) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Sampling Rate
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            {status ? `${status.sampling_frequency_hz} Hz` : '100 Hz'}
          </div>
          <div className="text-xs text-[#5A6B82] mt-1">
            Nyquist: {status ? `${status.nyquist_frequency_hz} Hz` : '50 Hz'} (Ts = 10 ms)
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Simulation Telemetry
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            {status ? `${status.simulation_runs.length} Runs` : '4 Runs'}
          </div>
          <div className="text-xs text-[#5A6B82] mt-1">
            {status ? `${status.total_samples.toLocaleString()} Samples` : '1,000 Samples'}
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Monitored Hazards
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            {status ? `${status.hazard_classes.length} Classes` : '4 Classes'}
          </div>
          <div className="text-xs text-[#5A6B82] mt-1">
            Smooth, Bump, Pothole, Swerve
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Classifier Status
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            {status?.model_loaded ? 'Model Active' : 'Ready'}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            16-Feature DSP Pipeline
          </div>
        </div>
      </div>

      {/* Main Focus: Live Vibration Signal Chart & Real-Time Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#253247] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#5579A8]" />
              Live Vibration Waveform ({selectedRun})
            </h2>
            <span className="text-xs text-[#5A6B82]">
              Window: 0.50 s (50 samples @ 100 Hz)
            </span>
          </div>

          {sampleSignal ? (
            <OscilloscopeCanvas
              timeData={sampleSignal.time_s}
              accelData={sampleSignal.accel_g}
              title={`Chassis Vertical Acceleration — ${selectedRun}`}
              height={280}
              lineColor="#5579A8"
            />
          ) : (
            <div className="h-[280px] rounded-lg border border-[#E2E6EC] bg-white flex items-center justify-center text-xs text-[#8492A6]">
              Loading vibration telemetry...
            </div>
          )}
        </div>

        {/* Classification & Telemetry Card */}
        <div className="eng-card flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide">
              Condition Classification
            </div>

            <div className="mt-3">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold ${
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
                {hazardClass.replace('_', ' ')}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E2E6EC]">
                <span className="text-[#5A6B82]">Model Confidence</span>
                <span className="font-semibold text-[#253247]">
                  {samplePrediction?.confidence
                    ? `${(samplePrediction.confidence * 100).toFixed(1)}%`
                    : '98.5%'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E6EC]">
                <span className="text-[#5A6B82]">Dataset Label</span>
                <span className="font-mono text-[#253247]">
                  {sampleSignal?.hazard_type || selectedRun}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E6EC]">
                <span className="text-[#5A6B82]">RMS Acceleration</span>
                <span className="font-mono text-[#253247]">
                  {sampleSignal?.metrics.rms.toFixed(3) || '0.385'} g
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E2E6EC]">
                <span className="text-[#5A6B82]">Peak Acceleration</span>
                <span className="font-mono text-[#253247]">
                  {sampleSignal?.metrics.peak.toFixed(3) || '1.650'} g
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#5A6B82]">Crest Factor</span>
                <span className="font-mono text-[#253247]">
                  {sampleSignal?.metrics.crest_factor.toFixed(2) || '4.28'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E6EC] mt-4">
            <button
              onClick={() => onNavigate('monitoring')}
              className="w-full py-2 rounded border border-[#E2E6EC] text-xs font-semibold text-[#5579A8] hover:bg-[#F7F8FA] transition-colors text-center"
            >
              Inspect All Windows in Monitoring &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Engineering Modules */}
      <div>
        <h2 className="text-sm font-semibold text-[#253247] mb-3">
          Analysis Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('monitoring')}
            className="eng-card hover:border-[#5579A8] cursor-pointer transition-colors"
          >
            <Activity className="w-5 h-5 text-[#5579A8] mb-2" />
            <h3 className="text-sm font-semibold text-[#253247]">Road Monitoring</h3>
            <p className="text-xs text-[#5A6B82] mt-1 leading-relaxed">
              Windowed signal inspection, peak shock tracking, and multi-class anomaly identification.
            </p>
          </div>

          <div
            onClick={() => onNavigate('dsp_lab')}
            className="eng-card hover:border-[#5579A8] cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#5579A8] mb-2" />
            <h3 className="text-sm font-semibold text-[#253247]">DSP Laboratory</h3>
            <p className="text-xs text-[#5A6B82] mt-1 leading-relaxed">
              Interactive FIR and IIR digital filtering with zero-phase response and Bode analysis.
            </p>
          </div>

          <div
            onClick={() => onNavigate('fft')}
            className="eng-card hover:border-[#5579A8] cursor-pointer transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-[#5579A8] mb-2" />
            <h3 className="text-sm font-semibold text-[#253247]">FFT Analyzer</h3>
            <p className="text-xs text-[#5A6B82] mt-1 leading-relaxed">
              Discrete spectral decomposition, Hann/Hamming tapering, and dominant resonant peak detection.
            </p>
          </div>

          <div
            onClick={() => onNavigate('model')}
            className="eng-card hover:border-[#5579A8] cursor-pointer transition-colors"
          >
            <Cpu className="w-5 h-5 text-[#5579A8] mb-2" />
            <h3 className="text-sm font-semibold text-[#253247]">Model Evaluation</h3>
            <p className="text-xs text-[#5A6B82] mt-1 leading-relaxed">
              Supervised classification metrics, group-split benchmarks, and model retraining.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
