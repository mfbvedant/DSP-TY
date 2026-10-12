# RoadSense AI — Engineering Mini-Project Report

## DSP-Based Road Condition Monitoring and Pothole Detection Using FFT, FIR/IIR Filters, and Machine Learning

**Course:** Digital Signal Processing  
**Year:** Third Year, Electronics and Telecommunication Engineering  
**Academic Year:** 2026–2027

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Introduction](#2-introduction)
3. [Problem Statement](#3-problem-statement)
4. [Objectives](#4-objectives)
5. [Existing Approach and Proposed Approach](#5-existing-approach-and-proposed-approach)
6. [System Architecture](#6-system-architecture)
7. [Dataset Description and Limitations](#7-dataset-description-and-limitations)
8. [Sampling and Quantization Concepts](#8-sampling-and-quantization-concepts)
9. [FIR Filter Theory and Equations](#9-fir-filter-theory-and-equations)
10. [IIR Filter Theory and Equations](#10-iir-filter-theory-and-equations)
11. [DFT and FFT Equations](#11-dft-and-fft-equations)
12. [Feature Extraction Methods](#12-feature-extraction-methods)
13. [Machine-Learning Methodology](#13-machine-learning-methodology)
14. [Experimental Results](#14-experimental-results)
15. [Filter Comparison](#15-filter-comparison)
16. [Classification Results](#16-classification-results)
17. [Limitations](#17-limitations)
18. [Future Scope](#18-future-scope)
19. [Conclusion](#19-conclusion)
20. [References](#20-references)

---

## 1. Abstract

This project implements a road-condition monitoring system that analyses simulated vehicle vibration data using Digital Signal Processing (DSP) techniques. The pipeline processes 100 Hz accelerometer data from a synthetic 2-DOF quarter-car physics simulation through FIR and IIR digital filters, performs FFT-based spectral analysis, extracts time- and frequency-domain features, and classifies road conditions using Random Forest and Support Vector Machine classifiers. An interactive Streamlit dashboard provides visualisation and analysis tools. The DSP pipeline operates independently of the machine-learning component, which supplements rather than replaces signal analysis. The dataset is synthetic and all results should be interpreted accordingly.

---

## 2. Introduction

Road surface quality significantly affects vehicle safety, comfort, and maintenance costs. Real-time detection of potholes, speed bumps, and rough road surfaces can enable driver warnings, vehicle suspension adaptation, and infrastructure maintenance prioritisation.

Modern vehicles carry inertial measurement units (IMUs) containing MEMS accelerometers and gyroscopes. The vertical acceleration signal (`chassis_accel_z_g`) captures road-surface impacts transmitted through the suspension system. By applying DSP techniques — filtering, spectral analysis, and feature extraction — these signals can be characterised and classified.

This project demonstrates the complete signal-processing pipeline from raw data to classification, emphasising the DSP foundations: sampling theory, FIR/IIR filter design, and FFT-based frequency-domain analysis.

---

## 3. Problem Statement

Design and implement a system that:

1. Processes vehicle vibration data sampled at 100 Hz.
2. Applies digital filtering to isolate road-impact information.
3. Analyses the frequency content using the Fast Fourier Transform.
4. Extracts discriminative features from time and frequency domains.
5. Classifies road conditions into distinct hazard categories.

The system must demonstrate DSP concepts independently and use machine learning only as a supplementary classification tool.

---

## 4. Objectives

1. Demonstrate sampling, Nyquist, and aliasing concepts with the dataset and illustrative signals.
2. Design and apply FIR (window method) and IIR (Butterworth) digital filters.
3. Perform FFT-based spectral analysis with proper windowing to reduce spectral leakage.
4. Extract meaningful time-domain features (RMS, crest factor, peak-to-peak) and frequency-domain features (dominant frequency, spectral centroid, band energies).
5. Train baseline ML classifiers (Random Forest, SVM) on DSP-extracted features.
6. Build an interactive dashboard for signal exploration and analysis.
7. Document all theory, equations, and results for academic review.

---

## 5. Existing Approach and Proposed Approach

### Existing Approaches

| Approach | Method | Limitation |
|----------|--------|------------|
| Threshold-based | Compare raw acceleration against fixed thresholds | Sensitive to vehicle speed and suspension type |
| Vision-based | Camera + image processing to detect potholes visually | Requires cameras, fails in poor visibility |
| Black-box ML | Feed raw sensor data directly into deep learning | No interpretability, requires large labelled datasets |

### Proposed Approach

A **transparent DSP pipeline** that:
- Uses FIR/IIR filters to isolate relevant vibration bands.
- Applies FFT for frequency characterisation.
- Extracts interpretable, physics-informed features.
- Uses conventional ML classifiers on these features.

This approach is interpretable, computationally lightweight, and demonstrates core DSP principles.

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CSV Dataset (100 Hz)                  │
│       Synthetic 2-DOF Quarter-Car Simulation            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Data Loading & Validation                   │
│    Schema check · Missing values · Run segmentation     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Preprocessing                          │
│    Baseline removal (mean subtraction) · Windowing      │
│    Configurable window size and overlap                  │
└────────────────────┬────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              ▼             ▼
┌──────────────────┐  ┌──────────────────┐
│   FIR Filtering  │  │   IIR Filtering  │
│  Window method   │  │   Butterworth    │
│  LP / HP / BP    │  │   SOS sections   │
│  Zero-phase      │  │   Zero-phase     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  FFT Analysis                            │
│    Single-sided magnitude spectrum                      │
│    Window function (Hann) · Dominant frequency          │
│    Spectral energy · Spectral centroid                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Feature Extraction                          │
│    Time: mean, std, RMS, crest factor, peak-to-peak    │
│    Freq: dominant freq, spectral centroid, band energy  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            ML Classification                             │
│    Random Forest · SVM (RBF kernel)                     │
│    Group-based split (by run_id)                        │
│    Accuracy · Precision · Recall · F1 · Confusion       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Interactive Streamlit Dashboard                 │
│    Signal viewer · Filter lab · FFT analyser            │
│    Feature table · Classification · Export               │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Dataset Description and Limitations

### 7.1 Source

The dataset is generated by a **synthetic** 2-DOF quarter-car mass-spring-damper physics simulation using Euler-Cromer numerical integration. It is **not** real vehicle sensor data.

### 7.2 Parameters

| Parameter | Value |
|-----------|-------|
| Sampling frequency | 100 Hz (Ts = 10 ms) |
| Sensor noise | σ = 0.015 g (MEMS accelerometer noise floor) |
| Simulation runs | 4 (in the first-1000 sample) |
| Samples per run | ~300 (3 seconds at 100 Hz) |
| Total samples | 1001 |

### 7.3 Columns

| Column | Unit | Description |
|--------|------|-------------|
| `run_id` | — | Unique simulation run identifier |
| `timestamp_ms` | ms | Telemetry timestamp (0–2990 ms per run) |
| `hazard_type` | — | Ground-truth road-condition label |
| `vehicle_speed_kmh` | km/h | Simulated constant velocity |
| `baseline_clearance_mm` | mm | Static ground clearance |
| `dynamic_ground_clearance_mm` | mm | Instantaneous chassis ground clearance |
| `chassis_accel_z_g` | g | Vertical chassis acceleration (primary signal) |
| `wheel_displacement_mm` | mm | Wheel vertical movement |
| `suspension_deflection_mm` | mm | Spring compression |
| `pitch_rate_deg_s` | deg/s | Body pitch rate |
| `roll_rate_deg_s` | deg/s | Body roll rate |
| `tire_normal_force_n` | N | Tire-road contact force |

### 7.4 Classes in the Sample

| Class | Samples | Description |
|-------|---------|-------------|
| POTHOLE | 300 | Pothole impact event |
| SPEED_BUMP | 300 | Speed-bump traversal |
| SMOOTH_HIGHWAY | 300 | Smooth road (noise only) |
| EVASIVE_SWERVE | 100 | Emergency lane-change manoeuvre |

**Note:** `ROUGH_ROAD` is mentioned in the full dataset documentation but is absent from this 1000-row sample.

### 7.5 Limitations

1. **Synthetic data** — does not capture real-world variability (multiple vehicles, road types, weather).
2. **Small sample** — only 4 runs; insufficient for robust statistical evaluation.
3. **Constant speed per run** — real scenarios involve acceleration/braking.
4. **Single-axis analysis** — the primary signal is vertical (z-axis) only.
5. **No ROUGH_ROAD class** — the target 3-class scheme (smooth/rough/pothole) cannot be fully evaluated.

---

## 8. Sampling and Quantization Concepts

### 8.1 Continuous-Time vs Discrete-Time Signals

A continuous-time signal x(t) exists for all values of time t ∈ ℝ. In practice, digital systems process discrete-time signals x[n] obtained by sampling x(t) at regular intervals.

### 8.2 Sampling

**Discrete-time sampling:**

```
x[n] = x(nTs)
```

where Ts is the sampling interval (period) and n ∈ ℤ is the sample index.

**Sampling frequency:**

```
fs = 1 / Ts
```

For this dataset: fs = 100 Hz, Ts = 10 ms = 0.01 s.

### 8.3 Nyquist Theorem

The **Nyquist–Shannon sampling theorem** states that a band-limited continuous signal can be perfectly reconstructed from its samples if the sampling frequency exceeds twice the highest frequency component:

```
fs > 2 · fmax
```

The **Nyquist frequency** is:

```
f_Nyquist = fs / 2 = 50 Hz
```

Any frequency component above 50 Hz in the original signal will be **aliased** — folded back into the 0–50 Hz range and become indistinguishable from a lower-frequency component.

### 8.4 Dataset Sampling Analysis

- **Stated fs:** 100 Hz
- **Measured mean interval:** 10.0 ms (exactly 100 Hz)
- **Nyquist frequency:** 50 Hz
- **Irregular intervals:** 0 (perfectly uniform synthetic data)

Since the dataset is synthetically generated, the sampling is perfectly uniform. In real sensors, clock jitter and dropped samples can create irregular intervals.

---

## 9. FIR Filter Theory and Equations

### 9.1 FIR Difference Equation

A Finite Impulse Response (FIR) filter computes the output y[n] as a weighted sum of the M+1 most recent input samples:

```
y[n] = Σ (k=0 to M) b[k] · x[n-k]
```

where:
- b[k] are the filter coefficients (also called taps)
- M is the filter order
- x[n-k] is the input delayed by k samples

### 9.2 Properties

| Property | FIR |
|----------|-----|
| Impulse response | Finite (M+1 samples) |
| Stability | Always stable (no feedback) |
| Linear phase | Achievable with symmetric coefficients |
| Computational cost | Higher (needs more taps for sharp cutoff) |

### 9.3 Design Method

This project uses the **window method** (`scipy.signal.firwin`):

1. Start with the ideal (infinite-length) impulse response.
2. Truncate it to M+1 samples.
3. Multiply by a window function (e.g., Hamming) to reduce sidelobe leakage.

### 9.4 Implementation Parameters

- **Design function:** `scipy.signal.firwin`
- **Configurable:** order (number of taps), cutoff frequency, filter type (LP/HP/BP)
- **Application:** Zero-phase filtering using `scipy.signal.filtfilt` (forward-backward, non-causal)

### 9.5 Frequency Response

The FIR frequency response is the DTFT of the filter coefficients:

```
H(ω) = Σ (k=0 to M) b[k] · e^(-jωk)
```

The magnitude |H(ω)| and phase ∠H(ω) are plotted in the dashboard.

---

## 10. IIR Filter Theory and Equations

### 10.1 IIR Difference Equation

An Infinite Impulse Response (IIR) filter uses both feedforward and feedback terms:

```
y[n] = Σ (k=0 to M) b[k] · x[n-k]  −  Σ (k=1 to N) a[k] · y[n-k]
```

where:
- b[k] are the feedforward (numerator) coefficients
- a[k] are the feedback (denominator) coefficients
- The feedback terms make the impulse response theoretically infinite

### 10.2 Properties

| Property | IIR |
|----------|-----|
| Impulse response | Infinite (decaying) |
| Stability | Must be verified (poles inside unit circle) |
| Linear phase | Not achievable in general |
| Computational cost | Lower (sharper cutoff with fewer coefficients) |

### 10.3 Butterworth Design

The Butterworth filter provides a **maximally flat** magnitude response in the passband. Its squared magnitude response is:

```
|H(jΩ)|² = 1 / (1 + (Ω/Ωc)^(2N))
```

where N is the filter order and Ωc is the cutoff frequency.

### 10.4 Stability

A digital IIR filter is stable if and only if all poles of H(z) lie strictly inside the unit circle in the z-plane:

```
|p_i| < 1  for all poles p_i
```

The project verifies this in the automated tests.

### 10.5 Second-Order Sections (SOS)

For numerical stability, the IIR filter is implemented as a cascade of second-order sections rather than a single high-order transfer function:

```
H(z) = Π (i=1 to L) H_i(z) = Π (i=1 to L) (b0i + b1i·z^(-1) + b2i·z^(-2)) / (1 + a1i·z^(-1) + a2i·z^(-2))
```

This avoids coefficient quantization problems that arise with high-order direct-form implementations.

### 10.6 Implementation

- **Design function:** `scipy.signal.butter(..., output='sos')`
- **Application:** `scipy.signal.sosfiltfilt` (zero-phase, non-causal)

---

## 11. DFT and FFT Equations

### 11.1 Discrete Fourier Transform (DFT)

The DFT converts a finite-length discrete-time signal x[n] (N samples) into its frequency-domain representation X[k]:

```
X[k] = Σ (n=0 to N-1) x[n] · e^(-j·2π·k·n/N)    for k = 0, 1, ..., N-1
```

Each X[k] represents the complex amplitude at frequency f_k = k · fs / N.

### 11.2 Inverse DFT

```
x[n] = (1/N) · Σ (k=0 to N-1) X[k] · e^(j·2π·k·n/N)
```

### 11.3 Fast Fourier Transform (FFT)

The FFT is an **efficient algorithm** for computing the DFT. It reduces the computational complexity from O(N²) to O(N log N) by exploiting symmetry and periodicity of the complex exponentials.

The most common FFT algorithm (Cooley-Tukey) recursively divides the DFT of size N into two DFTs of size N/2 (radix-2 decimation in time).

### 11.4 Frequency Resolution

```
Δf = fs / N
```

For a 0.5 s window at 100 Hz: N = 50 samples, Δf = 100/50 = 2.0 Hz.

### 11.5 Single-Sided Spectrum

For a real-valued signal, the DFT is conjugate-symmetric: X[k] = X*[N-k]. The single-sided spectrum uses only bins k = 0 to N/2, with magnitudes doubled (except DC and Nyquist):

```
|X_single[k]| = (2/N) · |X[k]|   for k = 1, ..., N/2-1
|X_single[0]| = (1/N) · |X[0]|   (DC component)
```

### 11.6 Spectral Leakage and Windowing

Analysing a finite segment is equivalent to multiplying the infinite signal by a rectangular window. This causes **spectral leakage** — energy from one frequency bin spreading into adjacent bins.

Applying a window function (Hann, Hamming, Blackman) before the FFT tapers the signal edges to zero, reducing sidelobe levels at the cost of slightly wider main lobes (reduced frequency resolution).

---

## 12. Feature Extraction Methods

### 12.1 Time-Domain Features

| Feature | Formula | Interpretation |
|---------|---------|----------------|
| Mean | μ = (1/N) Σ x[n] | DC offset (should be ~0 after baseline removal) |
| Standard Deviation | σ = √((1/N) Σ (x[n]-μ)²) | Signal spread / variability |
| Variance | σ² | Squared spread |
| **RMS** | **RMS = √((1/N) Σ x[n]²)** | Overall signal power / amplitude |
| Min / Max | min(x[n]), max(x[n]) | Extremes |
| Peak Absolute | max(\|x[n]\|) | Largest magnitude |
| Peak-to-Peak | max - min | Full amplitude range |
| **Crest Factor** | **peak / RMS** | Impulsiveness indicator |

**RMS equation:**

```
RMS = √( (1/N) · Σ (n=0 to N-1) x[n]² )
```

**Crest factor** is high for impulsive signals (potholes) and lower for continuous vibration (rough road).

### 12.2 Frequency-Domain Features

| Feature | Description |
|---------|-------------|
| Dominant Frequency | Frequency bin with maximum magnitude (Hz) |
| Spectral Centroid | Weighted average frequency (centre of mass of spectrum) |
| Spectral Energy | Σ \|X[k]\|² — total energy in the frequency domain |
| Spectral Spread | Standard deviation of the spectrum around the centroid |
| Low-Band Energy | Energy in 0–5 Hz (body sway, DC drift) |
| Mid-Band Energy | Energy in 5–20 Hz (suspension resonances, road impacts) |
| High-Band Energy | Energy in 20–50 Hz (tire noise, surface texture) |

---

## 13. Machine-Learning Methodology

### 13.1 Feature Matrix

The feature table contains one row per analysis window. Each row has 16 features (time + frequency domain) and the corresponding `hazard_type` label inherited from the simulation run.

### 13.2 Data-Leakage Prevention

- **Group-based split:** Train/test split is done by `run_id`, not randomly. This prevents overlapping windows from the same simulation run from appearing in both sets.
- **No label leakage:** Road-condition labels are not used as input features.
- **Scaler fitted on training data only:** The StandardScaler for SVM is fit on the training set and applied (transform only) to the test set.

### 13.3 Classifiers

**Random Forest:**
- Ensemble of 100 decision trees.
- Class-weight balancing for imbalanced classes.
- No feature scaling needed.

**Support Vector Machine (SVM):**
- RBF kernel with C = 1.0, γ = 'scale'.
- Requires feature scaling (StandardScaler).
- Probability calibration enabled.

### 13.4 Evaluation Metrics

- **Accuracy:** Overall fraction of correct predictions.
- **Precision:** Fraction of predicted positives that are true positives (per class, weighted).
- **Recall:** Fraction of actual positives correctly identified (per class, weighted).
- **F1-Score:** Harmonic mean of precision and recall.
- **Confusion Matrix:** Tabulates predicted vs actual classes.

---

## 14. Experimental Results

> **Note:** All results below are from a synthetic dataset with only 4 simulation runs. They should not be generalised to real-world performance.

The actual classification metrics are generated when the user trains the model through the dashboard. Results are saved to `outputs/evaluation_report.csv` and `outputs/classification_reports.txt`.

Due to the small number of runs (4), the train/test split leaves only 1 run for testing. This means:
- The test set contains samples from only one hazard class.
- Per-class metrics for classes not in the test set will be zero.
- The evaluation has very limited statistical power.

---

## 15. Filter Comparison

### FIR vs IIR Summary

| Property | FIR | IIR (Butterworth) |
|----------|-----|-------------------|
| Stability | Always stable | Must verify poles |
| Phase response | Linear phase (symmetric taps) | Non-linear phase |
| Transition band | Wider for same order | Sharper cutoff |
| Computational cost | Higher | Lower |
| Zero-phase offline | filtfilt | sosfiltfilt |
| Sensitivity to quantization | Low | High (mitigated by SOS) |

### Impact on Road-Impact Information

- **Low-pass filtering** preserves low-frequency body motion but removes high-frequency surface texture information.
- **High-pass filtering** removes slow drift and body sway, emphasising transient impacts.
- **Band-pass (5–20 Hz)** targets the suspension resonance band where pothole impacts are most prominent.

The optimal filter depends on the application: pothole detection benefits from a band-pass in the 5–20 Hz range, while general road roughness monitoring may need the full bandwidth.

---

## 16. Classification Results

Classification results are dynamically generated and saved when the model is trained through the dashboard. The saved files are:

- `outputs/evaluation_report.csv` — accuracy, precision, recall, F1 per model.
- `outputs/classification_reports.txt` — per-class metrics.
- `models/best_model.joblib` — the best-performing model.

**Important caveats:**
1. With only 4 runs, robust evaluation is not possible.
2. The model is trained on synthetic data and should not be deployed for real-world road monitoring without validation on real sensor data.
3. Model probabilities reflect classifier confidence, not real-world probability.

---

## 17. Limitations

1. **Synthetic data only** — all results are from physics simulation, not real vehicle recordings.
2. **Very small dataset** — 4 runs provide insufficient data for robust ML evaluation.
3. **Missing ROUGH_ROAD class** — the original 3-class target (smooth/rough/pothole) cannot be fully addressed.
4. **No real-time processing** — the pipeline uses offline zero-phase filtering (filtfilt), which is non-causal.
5. **Single vehicle model** — the simulation uses one set of vehicle parameters; real-world variability is not captured.
6. **No multi-axis fusion** — only the vertical acceleration is used as the primary signal.
7. **Group-based splitting with few groups** — the test set may contain only one class.
8. **No pretrained model integration** — no compatible pretrained model was found for this specific task (100 Hz quarter-car accelerometer classification).

---

## 18. Future Scope

1. **Real sensor data** — collect and validate with actual vehicle IMU recordings.
2. **Larger dataset** — use the full synthetic dataset (beyond the first 1000 rows) and add more simulation scenarios.
3. **Real-time implementation** — replace filtfilt with causal filtering for embedded systems (ESP32 / Arduino).
4. **Multi-axis fusion** — combine vertical acceleration with pitch rate, roll rate, and suspension deflection.
5. **Deep learning** — explore 1D-CNN or LSTM models on larger datasets.
6. **GPS integration** — map detected hazards to geographic coordinates.
7. **Edge deployment** — optimise the pipeline for microcontroller execution.
8. **ROUGH_ROAD class** — add simulated or real rough-road data to complete the 3-class objective.

---

## 19. Conclusion

This project demonstrates a complete DSP pipeline for road-condition monitoring using a synthetic vehicle suspension dataset. The key DSP concepts — sampling, FIR/IIR filter design, FFT-based spectral analysis — are implemented, tested, and visualised independently of the machine-learning component. The Random Forest and SVM classifiers supplement the DSP analysis by automating the classification of extracted features.

The project achieves its educational objectives: demonstrating core DSP theory with working Python implementations, providing an interactive dashboard for experimentation, and documenting the theory and equations for academic review. The limitations of the synthetic dataset and small sample size are clearly disclosed, and the results should not be interpreted as real-world performance claims.

---

## 20. References

1. Oppenheim, A. V., & Willsky, A. S. (1997). *Signals and Systems* (2nd ed.). Prentice Hall.
2. Oppenheim, A. V., & Schafer, R. W. (2009). *Discrete-Time Signal Processing* (3rd ed.). Pearson.
3. Proakis, J. G., & Manolakis, D. G. (2006). *Digital Signal Processing: Principles, Algorithms, and Applications* (4th ed.). Pearson.
4. Haykin, S. (2014). *Digital Communications*. Wiley.
5. SciPy documentation — `scipy.signal` module. https://docs.scipy.org/doc/scipy/reference/signal.html
6. Scikit-learn documentation. https://scikit-learn.org/stable/
7. NumPy FFT documentation. https://numpy.org/doc/stable/reference/routines.fft.html
8. Streamlit documentation. https://docs.streamlit.io/
9. Dataset source: Synthetic Vehicle Suspension & Telemetry Dataset — 2-DOF Quarter-Car Mass-Spring-Damper Physics Model.
10. Eriksson, J., Girod, L., Hull, B., Newton, R., Madden, S., & Balakrishnan, H. (2008). The Pothole Patrol: Using a Mobile Sensor Network for Road Surface Monitoring. *Proceedings of the 6th International Conference on Mobile Systems, Applications, and Services (MobiSys)*.
