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

