# RoadSense AI — DSP Viva Questions and Answers

## 25+ Questions Covering Sampling, Filters, FFT, Features, and ML

---

### Q1. What is the Sampling Theorem?

**A:** The Nyquist–Shannon sampling theorem states that a continuous-time signal can be perfectly reconstructed from its discrete-time samples if the sampling frequency fs is greater than twice the highest frequency component fmax of the signal:

```
fs > 2 · fmax
```

The minimum sampling rate 2·fmax is called the **Nyquist rate**. Half the sampling frequency (fs/2) is called the **Nyquist frequency** — the maximum frequency that can be represented without aliasing.

---

### Q2. What is aliasing? How does it affect this project?

**A:** Aliasing occurs when a signal is sampled at a rate lower than the Nyquist rate (fs < 2·fmax). High-frequency components are "folded back" into the lower-frequency range and become indistinguishable from genuine low-frequency components.

In this project, the sampling rate is 100 Hz, so the Nyquist frequency is 50 Hz. Any vibration component above 50 Hz in the real vehicle signal would be aliased. The synthetic dataset avoids this because the simulation does not generate frequencies above 50 Hz, but real MEMS accelerometers would need an analog anti-aliasing filter before the ADC.

---

### Q3. What is the difference between DFT and FFT?

**A:** The **DFT** (Discrete Fourier Transform) is the mathematical definition that converts N time-domain samples into N frequency-domain coefficients. The **FFT** (Fast Fourier Transform) is an efficient **algorithm** for computing the DFT. The DFT requires O(N²) operations; the FFT (Cooley-Tukey radix-2) reduces this to O(N log₂ N). For N = 1024, this is roughly a 100× speedup. Both produce identical results — the FFT is simply faster.

---

### Q4. What is the difference between FIR and IIR filters?

**A:**

| Property | FIR | IIR |
|----------|-----|-----|
| Impulse response | Finite length (M+1 samples) | Infinite length |
| Feedback | No (uses only input samples) | Yes (uses past output samples) |
| Stability | Always stable | Can be unstable if poles are outside the unit circle |
| Linear phase | Achievable (symmetric coefficients) | Generally not achievable |
| Order for sharp cutoff | High (many taps needed) | Low (fewer coefficients) |
| Computational cost | Higher per sample | Lower per sample |

---

### Q5. Why is filter stability important? How is it verified?

**A:** An unstable filter produces an output that grows without bound, even for a bounded input (BIBO instability). For a digital IIR filter, stability requires that all poles of the transfer function H(z) lie strictly inside the unit circle in the z-plane:

```
|p_i| < 1  for all poles p_i
```

In this project, the Butterworth design guarantees stability for valid parameters. The automated tests verify stability by computing the poles from the denominator polynomial and checking that all have magnitude < 1.

FIR filters are always stable because they have no poles (technically, all poles are at z = 0).

---

### Q6. What is a cutoff frequency?

**A:** The cutoff frequency fc is the frequency at which the filter's magnitude response drops to a specified level — typically −3 dB (≈ 70.7% of the passband amplitude). Below fc (for a low-pass filter), signals pass through with minimal attenuation. Above fc, signals are progressively attenuated.

In this project, the cutoff frequency must be between 0 Hz and the Nyquist frequency (50 Hz). It is normalised internally by scipy as fc / (fs/2).

---

### Q7. What is the frequency response of a digital filter?

**A:** The frequency response H(e^(jω)) describes how the filter modifies each frequency component. It has two parts:

- **Magnitude response |H(e^(jω))|:** How much each frequency is amplified or attenuated.
- **Phase response ∠H(e^(jω)):** How much each frequency is phase-shifted.

The magnitude response is plotted in dB (20·log₁₀|H|) and the phase in degrees. Together they fully characterise the filter's behaviour.

---

### Q8. What is spectral leakage and how is it reduced?

**A:** Spectral leakage occurs because the FFT operates on a finite-length signal segment. Truncating the signal is equivalent to multiplying by a rectangular window, whose frequency response has wide sidelobes. Energy from one frequency "leaks" into adjacent bins.

**Solution:** Apply a window function (Hann, Hamming, Blackman) before the FFT. These windows taper the signal edges to zero, reducing sidelobe levels. The trade-off is a wider main lobe, slightly reducing frequency resolution.

---

### Q9. What is frequency resolution and how does it depend on window length?

**A:** Frequency resolution is the minimum frequency difference that can be distinguished in the FFT output:

```
Δf = fs / N
```

where N is the number of samples in the window. Longer windows → more samples → finer resolution. For example, at fs = 100 Hz:
- 50 samples (0.5 s window): Δf = 2.0 Hz
- 200 samples (2.0 s window): Δf = 0.5 Hz

---

### Q10. What is RMS and why is it useful for road-condition monitoring?

**A:** RMS (Root Mean Square) is defined as:

```
RMS = √( (1/N) · Σ x[n]² )
```

RMS represents the "effective" amplitude of a signal — equivalent to the DC voltage that would deliver the same power. For road monitoring, RMS quantifies the overall vibration intensity: smooth roads have low RMS, potholes produce high transient RMS, and rough roads have moderate sustained RMS.

---

### Q11. What is the crest factor and why does it indicate impulsiveness?

**A:** Crest factor is the ratio of peak absolute value to RMS:

```
Crest Factor = peak / RMS
```

A pure sinusoid has a crest factor of √2 ≈ 1.414. A sharp pothole impact produces a very high peak relative to the overall RMS, resulting in a high crest factor. Smooth road signals have crest factors closer to √2. This makes crest factor a good discriminator for impulsive events.

---

### Q12. What is the spectral centroid?

**A:** The spectral centroid is the "centre of mass" of the frequency spectrum:

```
SC = Σ (f_k · |X[k]|) / Σ |X[k]|
```

It indicates where the average frequency energy is concentrated. A low spectral centroid suggests energy is concentrated at low frequencies (body motion), while a high centroid indicates high-frequency content (surface roughness, impacts).

---

### Q13. Why use second-order sections (SOS) for IIR filters?

**A:** High-order IIR filters in direct form (single b/a polynomial) suffer from **coefficient quantization errors** — small rounding errors in the coefficients can shift poles close to or outside the unit circle, causing instability or incorrect frequency response.

SOS representation cascades multiple second-order sections, each with its own pair of poles and zeros. Each section is individually well-conditioned. This significantly improves numerical stability, especially for orders ≥ 4.

---

### Q14. What is zero-phase filtering? Is it real-time?

**A:** Zero-phase filtering applies the filter twice — once forward and once backward. This cancels the phase distortion introduced by the filter, preserving the exact timing of signal features (important for locating pothole impacts in time).

**It is NOT real-time.** It requires the entire signal to be available beforehand (non-causal). For real-time applications, causal one-pass filtering must be used, accepting the phase distortion or using linear-phase FIR filters.

---

### Q15. What is data leakage in machine learning?

**A:** Data leakage occurs when information from the test set inadvertently influences the training process, leading to overly optimistic performance estimates. In this project, two types are relevant:

1. **Label leakage:** Using the road-condition label as an input feature. The project excludes `hazard_type` from feature columns.
2. **Window overlap leakage:** If overlapping windows from the same recording appear in both training and test sets, the model "memorises" the recording rather than learning general patterns. The project splits by `run_id` to prevent this.

---

### Q16. Why split by run_id instead of randomly?

**A:** Each run is a 3-second simulation of a single hazard event. Windows from the same run are highly correlated — they share the same vehicle speed, sensor noise realisation, and temporal context. Random splitting would place correlated windows in both train and test, artificially inflating accuracy. Group-based splitting ensures that the model is evaluated on a completely unseen scenario.

---

### Q17. What are the precision, recall, and F1-score?

**A:**
- **Precision** = TP / (TP + FP) — of all samples predicted as class X, how many are actually X?
- **Recall** = TP / (TP + FN) — of all actual class X samples, how many were correctly identified?
- **F1-Score** = 2 · (Precision · Recall) / (Precision + Recall) — harmonic mean balancing both.

High precision means few false alarms; high recall means few missed detections. For road safety, high recall (catching all potholes) may be prioritised over precision.

---

### Q18. What is a confusion matrix?

**A:** A confusion matrix is an N×N table (for N classes) where:
- Rows represent the **actual** class.
- Columns represent the **predicted** class.
- Diagonal elements are **correct predictions**.
- Off-diagonal elements are **misclassifications**.

It reveals which classes are confused with each other — e.g., whether speed bumps are being misclassified as potholes.

---

### Q19. Why is this dataset synthetic? What are the implications?

**A:** The dataset is generated by solving the differential equations of a 2-DOF quarter-car suspension model with added MEMS noise. Implications:

1. The physics model is simplified (no tire deformation, body roll dynamics, etc.).
2. The noise is Gaussian — real MEMS noise may have non-Gaussian components.
3. Performance on this data **does not guarantee** real-world performance.
4. The dataset is useful for demonstrating and testing the DSP pipeline, not for deployment.

---

### Q20. What is the Nyquist frequency for a 100 Hz sampling rate?

**A:** f_Nyquist = fs / 2 = 100 / 2 = **50 Hz**. This is the highest frequency that can be represented without aliasing at 100 Hz sampling.

---

### Q21. How does filter order affect the frequency response?

**A:** Higher filter order produces a **sharper transition** between the passband and stopband (steeper roll-off). However:
- For FIR: higher order means more taps → more computation per sample and longer delay.
- For IIR: higher order means more poles → increased risk of numerical instability (mitigated by SOS form) and more computation.

---

### Q22. What is the difference between a low-pass, high-pass, and band-pass filter?

**A:**
- **Low-pass:** Passes frequencies below the cutoff fc; attenuates frequencies above fc. Used to remove high-frequency noise.
- **High-pass:** Passes frequencies above fc; attenuates frequencies below fc. Used to remove DC offset and slow drift.
- **Band-pass:** Passes frequencies between f_low and f_high; attenuates everything outside. Used to isolate a specific frequency band (e.g., 5–20 Hz suspension resonance range).

---

### Q23. How does the Hann window affect the FFT result?

**A:** The Hann window `w[n] = 0.5(1 − cos(2πn/(N−1)))` tapers the signal to zero at both ends. Effects:
- **Reduces spectral leakage** — sidelobe levels are much lower than the rectangular window.
- **Widens the main lobe** — frequency resolution decreases slightly (by approximately a factor of 2).
- **Reduces amplitude accuracy** — corrected by applying a scaling factor.

It is one of the most commonly used windows for general-purpose spectral analysis.

---

### Q24. What is the Butterworth filter and why is it called "maximally flat"?

**A:** The Butterworth filter is designed to have the flattest possible magnitude response in the passband. The squared magnitude response is:

```
|H(jΩ)|² = 1 / (1 + (Ω/Ωc)^(2N))
```

At Ω = 0 (DC), the response is exactly 1 (0 dB). The first (2N−1) derivatives of the magnitude response are zero at DC. This means there is no ripple in the passband, unlike Chebyshev or Elliptic filters which trade ripple for sharper cutoff.

---

### Q25. What would be needed to implement this system in real time?

**A:**
1. **Causal filtering** — replace filtfilt with one-pass IIR filtering (accepting phase distortion) or use a linear-phase FIR filter with a known group delay.
2. **Streaming data** — process data in fixed-size buffers as it arrives from the sensor.
3. **Embedded platform** — implement on a microcontroller (ESP32, STM32) with fixed-point or efficient floating-point arithmetic.
4. **Anti-aliasing filter** — analog low-pass filter before the ADC to prevent aliasing.
5. **Latency constraints** — the classification must complete within one buffer period for real-time response.
6. **Power management** — optimise for battery-powered operation if deployed in a vehicle.

---

### Q26. What is the difference between a window function and a filter?

**A:** A **window function** is applied in the time domain to a finite-length signal segment before performing the FFT. Its purpose is to reduce spectral leakage by tapering the edges.

A **digital filter** modifies the frequency content of the signal by passing some frequencies and attenuating others. It is defined by its transfer function H(z) and is applied through convolution (FIR) or recursive computation (IIR).

A window function is not a frequency-selective filter — it modifies the spectral analysis rather than the signal itself.

---

### Q27. Why is class balancing important in this project?

**A:** The dataset has unequal class representation: POTHOLE (300), SPEED_BUMP (300), SMOOTH_HIGHWAY (300), EVASIVE_SWERVE (100). Without balancing, the classifier may be biased toward the majority classes and perform poorly on EVASIVE_SWERVE.

The project uses `class_weight='balanced'` in both Random Forest and SVM, which automatically adjusts the loss function to weight minority classes more heavily. This ensures that each class contributes proportionally to the training objective.

---

### Q28. How does the band-pass frequency range (5–20 Hz) relate to vehicle dynamics?

**A:** The 5–20 Hz range corresponds to the **suspension resonance frequencies** of a typical passenger vehicle:
- **Sprung mass resonance** (body bounce): ~1–3 Hz
- **Unsprung mass resonance** (wheel hop): ~10–15 Hz
- **Pothole impact transients:** produce broadband energy but concentrated in 5–20 Hz

Road surface impacts excite these resonances, creating distinctive frequency signatures. Frequencies below 5 Hz are dominated by body sway and drift; above 20 Hz by tire noise and sensor noise.

---

### Q29. What is Parseval's theorem and how does it relate to spectral energy?

**A:** Parseval's theorem states that the total energy of a signal computed in the time domain equals the total energy computed in the frequency domain:

```
Σ |x[n]|² = (1/N) · Σ |X[k]|²
```

This means we can compute signal energy from either domain. In the project, spectral energy (Σ|X[k]|²) is used as a feature — it captures total vibration intensity in the frequency domain.

---

### Q30. What are the key limitations of using only 4 simulation runs for ML evaluation?

**A:**
1. **No cross-validation** — with 4 groups, leave-one-out CV would evaluate on only 1 class per fold.
2. **Test set has one class** — the test run may contain only EVASIVE_SWERVE (or another single class), making per-class metrics incomplete.
3. **No confidence intervals** — the evaluation is a single point estimate with unknown variance.
4. **Overfitting risk** — the model may learn run-specific artefacts rather than generalizable patterns.
5. **Not deployable** — real-world deployment requires validation on hundreds of diverse runs from multiple vehicles.
