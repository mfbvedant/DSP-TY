// api.ts — Client library communicating with the RoadSense AI FastAPI backend

export interface SystemStatus {
  dataset_loaded: boolean;
  total_samples: number;
  sampling_frequency_hz: number;
  nyquist_frequency_hz: number;
  simulation_runs: string[];
  hazard_classes: string[];
  model_loaded: boolean;
  available_channels: string[];
}

export interface RunSummary {
  run_id: string;
  hazard_type: string;
  samples: number;
  duration_s: number;
}

export interface SignalWindowResponse {
  run_id: string;
  hazard_type: string;
  window_idx: number;
  total_windows: number;
  time_s: number[];
  accel_g: number[];
  metrics: {
    rms: number;
    peak: number;
    crest_factor: number;
    p2p: number;
    std: number;
  };
}

export interface FilterResponse {
  time_s: number[];
  raw_accel_g: number[];
  filtered_accel_g: number[];
  freq_hz: number[];
  magnitude_db: number[];
  phase_deg: number[];
  metrics: {
    rms_raw: number;
    rms_filtered: number;
    attenuation_pct: number;
    peak_raw: number;
    peak_filtered: number;
  };
}

export interface FFTResponse {
  freqs_hz: number[];
  magnitude: number[];
  dominant_freq_hz: number;
  spectral_centroid_hz: number;
  spectral_spread_hz: number;
  spectral_energy: number;
  frequency_resolution_hz: number;
  window_function: string;
}

export interface PredictResponse {
  predicted_class: string;
  confidence: number | null;
  all_classes: string[];
  probabilities: number[] | null;
  ground_truth: string;
  metrics: {
    rms: number;
    peak: number;
    crest_factor: number;
    p2p: number;
    std: number;
  };
}

export interface EvaluationResponse {
  metrics: Array<{
    Model: string;
    Accuracy: number;
    Precision: number;
    Recall: number;
    "F1-Score": number;
  }>;
  classification_report: string;
}

const API_BASE = '/api';

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchRuns(): Promise<RunSummary[]> {
  const res = await fetch(`${API_BASE}/runs`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

export async function fetchSignalWindow(
  runId: string,
  windowIdx: number,
  durationS: number = 0.5,
  channel: string = 'chassis_accel_z_g'
): Promise<SignalWindowResponse> {
  const url = `${API_BASE}/signal?run_id=${encodeURIComponent(runId)}&window_idx=${windowIdx}&window_duration_s=${durationS}&channel=${encodeURIComponent(channel)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch signal window');
  return res.json();
}

export async function runFilter(params: {
  run_id: string;
  filter_family: string;
  filter_type: string;
  cutoff: number | number[];
  order: number;
  channel?: string;
}): Promise<FilterResponse> {
  const res = await fetch(`${API_BASE}/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Filter application failed');
  }
  return res.json();
}

export async function runFFT(params: {
  run_id: string;
  window_idx: number;
  window_duration_s: number;
  window_function: string;
  channel?: string;
}): Promise<FFTResponse> {
  const res = await fetch(`${API_BASE}/fft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('FFT computation failed');
  return res.json();
}

export async function fetchSpectralClasses(): Promise<Record<string, { freqs: number[]; magnitude: number[] }>> {
  const res = await fetch(`${API_BASE}/spectral-classes`);
  if (!res.ok) throw new Error('Failed to fetch spectral classes');
  return res.json();
}

export async function predictWindow(params: {
  run_id: string;
  window_idx: number;
  window_duration_s: number;
  channel?: string;
}): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
}

export async function fetchEvaluation(): Promise<EvaluationResponse> {
  const res = await fetch(`${API_BASE}/evaluation`);
  if (!res.ok) throw new Error('Failed to fetch evaluation');
  return res.json();
}

export async function retrainModel(params: {
  window_duration_s: number;
  overlap: number;
}): Promise<{ success: boolean; best_model: string; total_windows: number }> {
  const res = await fetch(`${API_BASE}/retrain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Retraining failed');
  return res.json();
}

export interface ImportedModelStatusResponse {
  present: boolean;
  metadata: {
    status: string;
    model_file: string;
    model_path: string;
    file_size_mb: number;
    model_class: string;
    n_estimators: number;
    n_features_in: number;
    feature_names: string[];
    classes: number[];
    n_classes: number;
    classification_type: string;
  };
  compatibility: {
    compatible_raw: boolean;
    compatible_with_adapter: boolean;
    expected_feature_count: number;
    raw_column_count: number;
    has_triaxial_channels: boolean;
    missing_axes: string[];
    reasons: string[];
    recommended_action: string;
  };
}

export interface ImportedModelPredictResponse {
  model_name: string;
  predicted_class: number;
  interpretation: string;
  confidence: number;
  probabilities: number[];
  classes: number[];
  run_id: string;
  window_idx: number;
  ground_truth: string;
}

export async function fetchImportedModelStatus(): Promise<ImportedModelStatusResponse> {
  const res = await fetch(`${API_BASE}/imported-model/status`);
  if (!res.ok) throw new Error('Failed to fetch imported model status');
  return res.json();
}

export async function predictImportedModel(params: {
  run_id: string;
  window_idx: number;
  window_duration_s: number;
  channel?: string;
}): Promise<ImportedModelPredictResponse> {
  const res = await fetch(`${API_BASE}/imported-model/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Imported model prediction failed');
  return res.json();
}

// ------------------------------------------------------------------ //
// Universal Road Analysis API Contract                               //
// ------------------------------------------------------------------ //

export interface InputSummary {
  source_type: string;
  filename: string;
  file_size_bytes: number;
  total_samples: number;
  detected_columns: string[];
  selected_channel?: string;
  channel_selection_reason?: string;
  units?: string;
  has_header: boolean;
  has_timestamps: boolean;
  time_column?: string | null;
}

export interface SamplingInfo {
  has_timestamps: boolean;
  fs_hz: number | null;
  fs_method: string;
  is_uniform: boolean;
  interval_median_s: number | null;
  interval_std_s: number | null;
  irregularity_pct: number;
  duration_s: number | null;
  nyquist_hz: number | null;
}

export interface PreprocessingInfo {
  operations: string[];
  dc_offset_removed: number;
  cleaned_samples_count: number;
}

export interface DSPMetrics {
  mean: number;
  std: number;
  variance: number;
  rms: number;
  peak: number;
  peak_to_peak: number;
  crest_factor: number;
  sample_count: number;
  duration_s: number | null;
  fft_available: boolean;
  dominant_freq_hz: number | null;
  spectral_centroid_hz: number | null;
  spectral_spread_hz: number | null;
  spectral_energy: number | null;
  frequency_resolution_hz: number | null;
  waveform_downsampled: {
    time: number[];
    accel: number[];
  };
  fft_spectrum: {
    freqs_hz?: number[];
    magnitude?: number[];
  };
}

export interface FeaturesSummary {
  extracted_count: number;
  feature_names: string[];
  feature_values: Record<string, number>;
  feature_schema_valid: boolean;
}

export interface ModelInfo {
  model_architecture: string;
  model_artifact: string;
  features_expected: number;
  classes_supported: string[];
  trained_on: string;
  ground_truth_policy: string;
}

export interface PredictionResult {
  available: boolean;
  predicted_class: string;
  confidence: number | null;
  class_probabilities: Record<string, number>;
  all_classes: string[];
  inference_status: string;
  ground_truth: string | null;
}

export interface PotholeDecision {
  verdict: 'Pothole detected' | 'No pothole detected' | 'Uncertain — further inspection recommended' | 'Unable to analyse';
  verdict_code: 'POTHOLE_DETECTED' | 'NO_POTHOLE' | 'UNCERTAIN' | 'UNABLE_TO_ANALYSE';
  verdict_severity: 'hazard' | 'nominal' | 'warning' | 'error';
  primary_class: string;
  confidence_pct: number | null;
  confidence_threshold_used: number;
  summary: string;
  recommendation: string;
}

export interface ProcessingStep {
  stage: string;
  name: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED';
  details: string;
}

export interface AnalyzeResponse {
  success: boolean;
  input_summary?: InputSummary;
  sampling_info?: SamplingInfo;
  preprocessing?: PreprocessingInfo;
  dsp_metrics?: DSPMetrics;
  features_summary?: FeaturesSummary;
  model_info?: ModelInfo;
  prediction?: PredictionResult | null;
  pothole_decision: PotholeDecision;
  warnings: string[];
  errors: string[];
  processing_steps: ProcessingStep[];
  error?: string;
}

export async function analyzeRoad(payload: {
  data?: string;
  file?: File;
  filename?: string;
  assumed_fs?: number;
}): Promise<AnalyzeResponse> {
  if (payload.file) {
    const formData = new FormData();
    formData.append('file', payload.file);
    if (payload.assumed_fs) {
      formData.append('assumed_fs', payload.assumed_fs.toString());
    }
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis failed');
    }
    return res.json();
  } else {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload.data || '',
        filename: payload.filename || 'pasted_data.txt',
        assumed_fs: payload.assumed_fs,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      throw new Error(err.detail || 'Analysis failed');
    }
    return res.json();
  }
}


// ------------------------------------------------------------------ //
// User Signal Data — Shared signal state across pages                //
// ------------------------------------------------------------------ //

/**
 * Holds the essential signal data extracted after OverviewPage analysis.
 * Passed to DSP Lab, FFT Analyzer, Monitoring pages via App-level state.
 */
export interface UserSignalData {
  signal: number[];       // Raw acceleration values (detrended)
  fs: number;             // Sampling frequency in Hz
  channel: string;        // Detected channel name
  filename: string;       // Source filename
  totalSamples: number;   // Total number of samples
  analyzeResult: AnalyzeResponse;  // Full analysis result for reference
}

// ------------------------------------------------------------------ //
// User-Signal API Functions (Operate on user-provided signal arrays) //
// ------------------------------------------------------------------ //

export async function userSignalFilter(params: {
  signal: number[];
  fs: number;
  filter_family: string;
  filter_type: string;
  cutoff: number | number[];
  order: number;
}): Promise<FilterResponse> {
  const res = await fetch(`${API_BASE}/user-signal/filter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'User signal filter failed');
  }
  return res.json();
}

export async function userSignalFFT(params: {
  signal: number[];
  fs: number;
  window_idx: number;
  window_duration_s: number;
  window_function: string;
}): Promise<FFTResponse & { total_windows?: number }> {
  const res = await fetch(`${API_BASE}/user-signal/fft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'User signal FFT failed');
  }
  return res.json();
}

export interface UserSignalWindowResponse {
  window_idx: number;
  total_windows: number;
  time_s: number[];
  accel_g: number[];
  metrics: {
    rms: number;
    peak: number;
    crest_factor: number;
    p2p: number;
    std: number;
  };
}

export async function userSignalWindow(params: {
  signal: number[];
  fs: number;
  window_idx: number;
  window_duration_s: number;
}): Promise<UserSignalWindowResponse> {
  const res = await fetch(`${API_BASE}/user-signal/window`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'User signal window failed');
  }
  return res.json();
}

export async function userSignalPredict(params: {
  signal: number[];
  fs: number;
  window_idx: number;
  window_duration_s: number;
}): Promise<PredictResponse & { total_windows?: number }> {
  const res = await fetch(`${API_BASE}/user-signal/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'User signal prediction failed');
  }
  return res.json();
}
