import React, { useState } from 'react';
import {
  ArrowRight,
  Activity,
  SlidersHorizontal,
  BarChart3,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Info,
  Upload,
  FileText,
  RotateCcw,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import {
  SystemStatus,
  analyzeRoad,
  AnalyzeResponse,
  UserSignalData,
} from '../api';
import { OscilloscopeCanvas } from '../components/OscilloscopeCanvas';
import { FFTCanvas } from '../components/FFTCanvas';

// Realistic sample presets for instant 1-click evaluation
const PRESET_POTHOLE = `timestamp_ms,chassis_accel_z_g
250,-0.0065
260,-0.0241
270,0.0086
280,0.0113
290,-0.0298
300,-0.0085
310,0.0134
320,-0.0339
330,-0.0067
340,0.0016
350,0.0085
360,-0.0076
370,-0.0178
380,0.0097
390,0.0138
400,0.0297
410,-0.0141
420,0.0109
430,0.0271
440,0.0007
450,-0.0055
460,-0.0031
470,0.0183
480,0.0155
490,0.0085
500,-0.0202
510,-0.6354
520,-1.6505
530,-1.3676
540,0.1791
550,1.1871
560,1.3839
570,1.0700
580,0.5075
590,0.0307
600,-0.2345
610,-0.2976
620,-0.1943
630,-0.0633
640,0.1031
650,0.1572
660,0.1567
670,0.1196
680,0.0527
690,0.0569
700,0.0088
710,0.0014
720,0.0168
730,0.0089
740,0.0291`;

const PRESET_SMOOTH = `timestamp_ms,chassis_accel_z_g
0,0.0136
10,-0.0096
20,-0.0302
30,0.0001
40,0.0012
50,0.0037
60,-0.0058
70,0.0004
80,-0.0101
90,0.0014
100,-0.0036
110,0.0058
120,-0.0060
130,0.0083
140,-0.0056
150,-0.0091
160,-0.0061
170,-0.0010
180,0.0119
190,0.0129
200,-0.0179
210,0.0012
220,-0.0035
230,0.0064
240,-0.0139
250,0.0218
260,0.0007
270,0.0022
280,-0.0203
290,0.0195
300,-0.0146
310,0.0053
320,-0.0287
330,-0.0232
340,0.0171
350,0.0263
360,-0.0216
370,-0.0168
380,-0.0375
390,0.0124
400,0.0031
410,-0.0162
420,0.0220
430,0.0190
440,-0.0109
450,-0.0084
460,0.0299
470,-0.0207
480,-0.0026
490,0.0071`;

const PRESET_SPEED_BUMP = `timestamp_ms,chassis_accel_z_g
0,0.0304
10,-0.0034
20,-0.0057
30,0.0187
40,-0.0011
50,-0.0108
60,0.0065
70,0.0202
80,-0.0113
90,0.0022
100,0.0105
110,0.0015
120,0.0053
130,-0.0023
140,0.0124
150,-0.0039
160,0.0183
170,-0.0198
180,0.0212
190,0.0135
200,0.0183
210,0.0126
220,-0.0054
230,0.0294
240,0.0091
250,-0.0010
260,-0.0132
270,0.0072
280,-0.0132
290,0.0017
300,-0.0100
310,0.0009
320,-0.0074
330,0.0256
340,0.0030
350,-0.0072
360,0.0251
370,-0.0120
380,0.0286
390,-0.0085
400,-0.0159
410,0.0114
420,0.0223
430,-0.0134
440,-0.0158
450,0.0081
460,0.0077
470,0.0183
480,0.0146
490,-0.0111`;

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  status: SystemStatus | null;
  onSignalAnalyzed?: (data: UserSignalData | null) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, status, onSignalAnalyzed }) => {
  // Input mode state: 'paste' | 'upload'
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState<string>(PRESET_POTHOLE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assumedFs, setAssumedFs] = useState<string>('');

  // Execution & results state
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client-side preview calculation
  const getClientPreview = () => {
    if (inputMode === 'paste') {
      const lines = pastedText.trim().split('\n').filter((l) => l.trim().length > 0);
      const rowCount = lines.length;
      const firstLine = lines[0] || '';
      const estimatedCols = firstLine.split(/[,;\t\s]+/).filter(Boolean).length;
      return {
        count: rowCount,
        cols: estimatedCols,
        previewLines: lines.slice(0, 3),
      };
    } else if (selectedFile) {
      return {
        count: 'Pending analysis',
        cols: 'Auto-detecting',
        name: selectedFile.name,
        size: `${(selectedFile.size / 1024).toFixed(1)} KB`,
      };
    }
    return null;
  };

  const preview = getClientPreview();

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setErrorMessage(null);

    const parsedFs = assumedFs.trim() ? parseFloat(assumedFs) : undefined;

    try {
      let res: AnalyzeResponse;
      if (inputMode === 'upload' && selectedFile) {
        res = await analyzeRoad({
          file: selectedFile,
          filename: selectedFile.name,
          assumed_fs: parsedFs,
        });
      } else {
        if (!pastedText.trim()) {
          throw new Error('Please paste vibration telemetry samples into the text area.');
        }
        res = await analyzeRoad({
          data: pastedText,
          filename: 'pasted_vibration_data.txt',
          assumed_fs: parsedFs,
        });
      }

      setAnalysisResult(res);
      setAnalyzing(false);

      // Emit signal data to App-level state for cross-page sharing
      if (res.success && res.dsp_metrics?.waveform_downsampled && res.sampling_info?.fs_hz && onSignalAnalyzed) {
        onSignalAnalyzed({
          signal: res.dsp_metrics.waveform_downsampled.accel,
          fs: res.sampling_info.fs_hz,
          channel: res.input_summary?.selected_channel || 'user_input',
          filename: res.input_summary?.filename || 'pasted_data.txt',
          totalSamples: res.input_summary?.total_samples || res.dsp_metrics.waveform_downsampled.accel.length,
          analyzeResult: res,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Analysis pipeline failed.');
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Section Shortcuts */}
      <div className="bg-white border border-[#E2E6EC] rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight">
            Road Condition Analysis
          </h1>
          <p className="text-xs text-[#5A6B82] mt-0.5 max-w-2xl">
            Input raw vehicle vibration data to determine sampling rate, extract DSP feature moments, and evaluate genuine machine learning pothole predictions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('monitoring')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E6EC] bg-white text-[#253247] text-xs font-medium hover:bg-[#F7F8FA] transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-[#5579A8]" />
            Road Monitoring
          </button>
          <button
            onClick={() => onNavigate('dsp_lab')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E6EC] bg-white text-[#253247] text-xs font-medium hover:bg-[#F7F8FA] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#5A6B82]" />
            DSP Laboratory
          </button>
        </div>
      </div>

      {/* ERROR BANNER IF ANALYSIS FAILED */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828] text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">Analysis Pipeline Error</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* RESULTS DASHBOARD VIEW (Rendered when analysisResult exists) */}
      {analysisResult ? (
        <div className="space-y-6">
          {/* PRIMARY LARGE PROMINENT RESULT CARD */}
          <div
            className={`eng-card border-l-4 p-6 space-y-5 shadow-xs ${
              analysisResult.pothole_decision.verdict_code === 'POTHOLE_DETECTED'
                ? 'border-l-[#C62828]'
                : analysisResult.pothole_decision.verdict_code === 'NO_POTHOLE'
                ? 'border-l-[#2E7D32]'
                : analysisResult.pothole_decision.verdict_code === 'UNCERTAIN'
                ? 'border-l-[#B78103]'
                : 'border-l-[#8492A6]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6EC] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#8492A6] uppercase tracking-wider">
                  Road Condition Verdict
                </span>
                <span className="text-xs text-[#8492A6]">•</span>
                <span className="text-xs font-mono text-[#5A6B82]">
                  {analysisResult.input_summary?.filename || 'Pasted Telemetry'}
                </span>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[#E2E6EC] bg-white hover:bg-[#F7F8FA] text-xs font-medium text-[#253247] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5A6B82]" />
                Analyse Another Sample
              </button>
            </div>

            {/* Prominent Plain Language Verdict */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-[#F7F8FA] border border-[#E2E6EC]">
                    {analysisResult.pothole_decision.verdict_code === 'POTHOLE_DETECTED' ? (
                      <AlertTriangle className="w-6 h-6 text-[#C62828]" />
                    ) : analysisResult.pothole_decision.verdict_code === 'NO_POTHOLE' ? (
                      <CheckCircle2 className="w-6 h-6 text-[#2E7D32]" />
                    ) : analysisResult.pothole_decision.verdict_code === 'UNCERTAIN' ? (
                      <AlertCircle className="w-6 h-6 text-[#B78103]" />
                    ) : (
                      <HelpCircle className="w-6 h-6 text-[#8492A6]" />
                    )}
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#253247] tracking-tight">
                      {analysisResult.pothole_decision.verdict}
                    </div>
                    <div className="text-xs font-mono text-[#5A6B82] mt-0.5">
                      Predicted Condition:{' '}
                      <span className="font-semibold text-[#253247]">
                        {analysisResult.prediction?.predicted_class || 'Unable to Classify'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#5A6B82] leading-relaxed pt-1">
                  {analysisResult.pothole_decision.summary}
                </p>

                <div className="text-xs text-[#253247] bg-[#F7F8FA] p-2.5 rounded border border-[#E2E6EC] font-medium">
                  <strong>Recommendation:</strong> {analysisResult.pothole_decision.recommendation}
                </div>
              </div>

              {/* Confidence Callout */}
              <div className="shrink-0 bg-[#F7F8FA] border border-[#E2E6EC] rounded-lg p-4 min-w-[210px] text-center md:text-right">
                <div className="text-[11px] font-semibold text-[#8492A6] uppercase tracking-wider">
                  Model Confidence
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-[#253247] mt-0.5 font-mono">
                  {analysisResult.prediction?.confidence !== null && analysisResult.prediction?.confidence !== undefined
                    ? `${(analysisResult.prediction.confidence * 100).toFixed(1)}%`
                    : '—'}
                </div>
                <div className="text-[11px] text-[#5A6B82] mt-1">
                  Decision Threshold: {(analysisResult.pothole_decision.confidence_threshold_used * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Input Summary Diagnostics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[11px] font-medium text-[#8492A6]">Sample Count</div>
                <div className="text-sm font-bold text-[#253247] mt-0.5">
                  {analysisResult.input_summary?.total_samples.toLocaleString()} samples
                </div>
                <div className="text-[10px] text-[#5A6B82] mt-0.5">
                  Duration: {analysisResult.sampling_info?.duration_s !== null ? `${analysisResult.sampling_info?.duration_s} s` : 'Unknown'}
                </div>
              </div>

              <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[11px] font-medium text-[#8492A6]">Detected Vibration Channel</div>
                <div className="text-sm font-bold text-[#253247] mt-0.5 truncate">
                  {analysisResult.input_summary?.selected_channel || 'Auto-selected'}
                </div>
                <div className="text-[10px] text-[#2E7D32] mt-0.5 font-medium">
                  Vertical acceleration axis
                </div>
              </div>

              <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[11px] font-medium text-[#8492A6]">Sampling Frequency</div>
                <div className="text-sm font-bold text-[#253247] mt-0.5">
                  {analysisResult.sampling_info?.fs_hz !== null
                    ? `${analysisResult.sampling_info?.fs_hz} Hz`
                    : 'Unknown'}
                </div>
                <div className="text-[10px] text-[#5A6B82] mt-0.5 truncate" title={analysisResult.sampling_info?.fs_method}>
                  {analysisResult.sampling_info?.fs_method}
                </div>
              </div>

              <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[11px] font-medium text-[#8492A6]">Ground-Truth Policy</div>
                <div className="text-sm font-bold text-[#253247] mt-0.5">
                  None (Pure Model Inference)
                </div>
                <div className="text-[10px] text-[#5A6B82] mt-0.5">
                  No dataset labels used
                </div>
              </div>
            </div>

            {/* Warnings list if any */}
            {analysisResult.warnings && analysisResult.warnings.length > 0 && (
              <div className="p-3 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Signal Preprocessing & Analysis Notes:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {analysisResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* SIGNAL ANALYSIS: WAVEFORM & FFT SPECTRAL PLOTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waveform Visualizer */}
            <div className="eng-card space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5A6B82]">
                <span className="font-semibold text-[#253247] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#5579A8]" />
                  Detrended Vibration Waveform
                </span>
                <span>
                  {analysisResult.dsp_metrics?.sample_count} points
                </span>
              </div>

              {analysisResult.dsp_metrics?.waveform_downsampled ? (
                <OscilloscopeCanvas
                  timeData={analysisResult.dsp_metrics.waveform_downsampled.time}
                  accelData={analysisResult.dsp_metrics.waveform_downsampled.accel}
                  title={`Acceleration (g) — ${analysisResult.input_summary?.selected_channel}`}
                  height={240}
                  lineColor="#5579A8"
                />
              ) : (
                <div className="h-[240px] rounded border border-[#E2E6EC] bg-white flex items-center justify-center text-xs text-[#8492A6]">
                  No waveform data available
                </div>
              )}
            </div>

            {/* FFT Spectrum Visualizer */}
            <div className="eng-card space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5A6B82]">
                <span className="font-semibold text-[#253247] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#5579A8]" />
                  FFT Magnitude Spectrum
                </span>
                <span>
                  Nyquist: {analysisResult.sampling_info?.nyquist_hz ? `${analysisResult.sampling_info.nyquist_hz} Hz` : 'N/A'}
                </span>
              </div>

              {analysisResult.dsp_metrics?.fft_available && analysisResult.dsp_metrics.fft_spectrum.freqs_hz ? (
                <FFTCanvas
                  freqs={analysisResult.dsp_metrics.fft_spectrum.freqs_hz}
                  magnitude={analysisResult.dsp_metrics.fft_spectrum.magnitude || []}
                  dominantFreq={analysisResult.dsp_metrics.dominant_freq_hz || 0}
                  height={240}
                />
              ) : (
                <div className="h-[240px] rounded border border-[#E2E6EC] bg-white flex flex-col items-center justify-center text-xs text-[#8492A6] p-4 text-center">
                  <HelpCircle className="w-6 h-6 mb-2 text-[#8492A6]" />
                  <span>FFT spectrum requires verified sampling frequency.</span>
                  <span className="text-[11px] mt-1 text-[#5A6B82]">Timestamps were absent from data stream.</span>
                </div>
              )}
            </div>
          </div>

          {/* KEY DSP MEASUREMENTS GRID */}
          <div className="eng-card">
            <h3 className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide mb-3">
              Extracted Digital Signal Processing Measurements
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">RMS Energy</div>
                <div className="font-bold text-[#253247] mt-0.5">{analysisResult.dsp_metrics?.rms.toFixed(4)} g</div>
              </div>
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">Peak Amplitude</div>
                <div className="font-bold text-[#253247] mt-0.5">{analysisResult.dsp_metrics?.peak.toFixed(4)} g</div>
              </div>
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">Crest Factor</div>
                <div className="font-bold text-[#253247] mt-0.5">{analysisResult.dsp_metrics?.crest_factor.toFixed(2)}</div>
              </div>
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">Peak-to-Peak</div>
                <div className="font-bold text-[#253247] mt-0.5">{analysisResult.dsp_metrics?.peak_to_peak.toFixed(4)} g</div>
              </div>
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">Dominant Resonant Freq</div>
                <div className="font-bold text-[#253247] mt-0.5">
                  {analysisResult.dsp_metrics?.dominant_freq_hz !== null ? `${analysisResult.dsp_metrics?.dominant_freq_hz} Hz` : '—'}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="text-[#8492A6] text-[10px] font-sans">Spectral Centroid</div>
                <div className="font-bold text-[#253247] mt-0.5">
                  {analysisResult.dsp_metrics?.spectral_centroid_hz !== null ? `${analysisResult.dsp_metrics?.spectral_centroid_hz} Hz` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* MODEL EVIDENCE & CLASS PROBABILITIES */}
          {analysisResult.prediction && analysisResult.prediction.available && (
            <div className="eng-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide">
                  Model Evidence & Posterior Class Probabilities
                </h3>
                <span className="text-xs text-[#5A6B82] font-mono">
                  {analysisResult.model_info?.model_architecture}
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(analysisResult.prediction.class_probabilities || {}).map(([cName, pVal]) => (
                  <div key={cName} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[#253247] font-semibold">{cName.replace('_', ' ')}</span>
                      <span className="text-[#5A6B82]">{(pVal * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#EEF2F6] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          cName.includes('POTHOLE')
                            ? 'bg-[#C62828]'
                            : cName.includes('SMOOTH')
                            ? 'bg-[#2E7D32]'
                            : 'bg-[#5579A8]'
                        }`}
                        style={{ width: `${Math.max(2, pVal * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ORDERED AUDIT TRACE LOG */}
          <div className="eng-card space-y-3">
            <h3 className="text-xs font-semibold text-[#8492A6] uppercase tracking-wide">
              Pipeline Audit & Verification Trace
            </h3>
            <div className="divide-y divide-[#E2E6EC] text-xs">
              {analysisResult.processing_steps.map((st, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        st.status === 'SUCCESS'
                          ? 'bg-[#2E7D32]'
                          : st.status === 'WARNING'
                          ? 'bg-[#B78103]'
                          : 'bg-[#C62828]'
                      }`}
                    />
                    <span className="font-semibold text-[#253247]">{st.name}</span>
                  </div>
                  <span className="text-[#5A6B82] text-[11px] truncate max-w-md">{st.details}</span>
                  <span
                    className={`badge-clean text-[10px] uppercase font-bold shrink-0 ${
                      st.status === 'SUCCESS'
                        ? 'badge-green'
                        : st.status === 'WARNING'
                        ? 'badge-amber'
                        : 'badge-red'
                    }`}
                  >
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* INPUT INTERFACE CONSOLE (Rendered when no active result) */
        <div className="eng-card p-6 space-y-6 shadow-xs">
          {/* Input Method Selector Tabs */}
          <div className="flex items-center justify-between border-b border-[#E2E6EC] pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setInputMode('paste')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  inputMode === 'paste'
                    ? 'bg-[#5579A8] text-white shadow-xs'
                    : 'bg-[#F7F8FA] text-[#5A6B82] hover:bg-[#EEF2F6]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Raw Data
              </button>
              <button
                onClick={() => setInputMode('upload')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  inputMode === 'upload'
                    ? 'bg-[#5579A8] text-white shadow-xs'
                    : 'bg-[#F7F8FA] text-[#5A6B82] hover:bg-[#EEF2F6]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Data File (.csv / .txt)
              </button>
            </div>

            <span className="text-[11px] text-[#8492A6] hidden sm:inline">
              Unified Data-to-Prediction Engine
            </span>
          </div>

          {/* PASTE DATA VIEW */}
          {inputMode === 'paste' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs text-[#5A6B82]">
                  <label className="font-medium text-[#253247]">
                    Paste Telemetry (CSV, TSV, space-separated, or single-column acceleration):
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8492A6]">Presets:</span>
                    <button
                      onClick={() => setPastedText(PRESET_POTHOLE)}
                      className="px-2 py-0.5 rounded border border-[#E2E6EC] bg-white text-[11px] hover:bg-[#F7F8FA] text-[#253247]"
                    >
                      Pothole
                    </button>
                    <button
                      onClick={() => setPastedText(PRESET_SMOOTH)}
                      className="px-2 py-0.5 rounded border border-[#E2E6EC] bg-white text-[11px] hover:bg-[#F7F8FA] text-[#253247]"
                    >
                      Smooth Highway
                    </button>
                    <button
                      onClick={() => setPastedText(PRESET_SPEED_BUMP)}
                      className="px-2 py-0.5 rounded border border-[#E2E6EC] bg-white text-[11px] hover:bg-[#F7F8FA] text-[#253247]"
                    >
                      Speed Bump
                    </button>
                  </div>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={8}
                  placeholder={`timestamp_ms,chassis_accel_z_g\n0,0.012\n10,0.045\n20,-0.032\n...`}
                  className="w-full p-3 font-mono text-xs rounded border border-[#E2E6EC] bg-[#F7F8FA] text-[#253247] focus:bg-white focus:outline-hidden focus:border-[#5579A8] transition-colors leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* UPLOAD FILE VIEW */}
          {inputMode === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-8 text-center bg-[#F7F8FA] hover:bg-[#F1F5F9] transition-colors">
                <Upload className="w-8 h-8 text-[#5579A8] mx-auto mb-2" />
                <div className="text-xs font-semibold text-[#253247]">
                  {selectedFile ? selectedFile.name : 'Choose a CSV or TXT file to analyze'}
                </div>
                <p className="text-[11px] text-[#8492A6] mt-1">
                  Supported formats: comma-separated (.csv), tab-separated, or space-separated (.txt)
                </p>

                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="mt-3 inline-block px-4 py-1.5 rounded border border-[#E2E6EC] bg-white text-xs font-medium text-[#253247] cursor-pointer hover:bg-[#F7F8FA] transition-colors"
                >
                  {selectedFile ? 'Replace File' : 'Browse Computer'}
                </label>

                {selectedFile && (
                  <div className="mt-3 text-xs text-[#2E7D32] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready to analyze ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPTIONAL SAMPLING RATE & LIVE CLIENT PREVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#E2E6EC]">
            <div>
              <label className="block text-xs font-medium text-[#253247] mb-1">
                Nominal Sampling Rate (Optional):
              </label>
              <input
                type="number"
                value={assumedFs}
                onChange={(e) => setAssumedFs(e.target.value)}
                placeholder="Auto-detected from timestamps (e.g. 100 Hz)"
                className="clean-input w-full text-xs"
              />
              <p className="text-[11px] text-[#8492A6] mt-1">
                Leave empty to calculate automatically from timestamps. Only specify if your data lacks time columns.
              </p>
            </div>

            {/* Input Preview Box */}
            <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC] text-xs">
              <div className="text-[11px] font-semibold text-[#8492A6] uppercase tracking-wide mb-1">
                Input Data Preview
              </div>
              {preview ? (
                <div className="space-y-1 text-[#5A6B82] font-mono text-[11px]">
                  <div>Samples / Rows: <span className="font-semibold text-[#253247]">{preview.count}</span></div>
                  <div>Estimated Columns: <span className="font-semibold text-[#253247]">{preview.cols}</span></div>
                  {preview.previewLines && (
                    <div className="text-[10px] text-[#8492A6] truncate mt-1">
                      {preview.previewLines.join(' | ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[#8492A6]">No data entered yet.</div>
              )}
            </div>
          </div>

          {/* PRIMARY ACTION BUTTON BAR */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setPastedText('');
                setSelectedFile(null);
                setAssumedFs('');
              }}
              className="px-3 py-1.5 rounded border border-[#E2E6EC] bg-white text-xs font-medium text-[#5A6B82] hover:bg-[#F7F8FA] transition-colors"
            >
              Clear
            </button>

            <button
              onClick={handleAnalyze}
              disabled={analyzing || (inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && !pastedText.trim())}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#5579A8] hover:bg-[#43648E] text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
            >
              {analyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Processing DSP & Model Inference...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyse Road
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SYSTEM ARCHITECTURE & TELEMETRY SUMMARY ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Sampling Engine
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            {status ? `${status.sampling_frequency_hz} Hz` : '100 Hz'}
          </div>
          <div className="text-xs text-[#5A6B82] mt-1">
            Nyquist Limit: 50 Hz (Anti-Aliasing)
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Verified Categories
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            4 Classes
          </div>
          <div className="text-xs text-[#5A6B82] mt-1">
            Pothole, Bump, Smooth, Swerve
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Classifier Architecture
          </div>
          <div className="text-2xl font-bold text-[#253247] mt-1">
            Random Forest
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            16-Feature DSP Moments
          </div>
        </div>

        <div className="eng-card py-4">
          <div className="text-xs text-[#8492A6] font-medium uppercase tracking-wide">
            Live Stream Notice
          </div>
          <div className="text-xs text-[#5A6B82] mt-1 leading-relaxed">
            Connect live sensor stream for in-vehicle driving detection; simulation alone does not prove live deployment.
          </div>
        </div>
      </div>

      {/* DEDICATED ENGINEERING MODULE NAVIGATION */}
      <div>
        <h2 className="text-sm font-semibold text-[#253247] mb-3">
          Dedicated Engineering Modules
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
