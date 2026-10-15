import React, { useState } from 'react';
import {
  SlidersHorizontal,
  BarChart3,
  Activity,
  Info,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Maximize2,
} from 'lucide-react';

export const DSPTheoryPage: React.FC = () => {
  const [activeTopic, setActiveTopic] = useState<'fir_iir' | 'lpf_hpf' | 'pothole_filter' | 'fft_theory' | 'matrix'>('pothole_filter');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#E2E6EC] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#253247] tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-[#5579A8]" />
              DSP & Road Hazard Theory Center
            </h1>
            <p className="text-xs text-[#5A6B82] mt-0.5">
              Engineering foundations: Digital filtering dynamics, frequency transitions, and waveform interpretation for pothole detection.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-clean bg-[#EDF2F7] text-[#5579A8] font-mono text-[11px]">
              DSP Theory & Diagnostics
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'pothole_filter', label: '1. Pothole Waveform Signature', icon: AlertTriangle },
          { id: 'fir_iir', label: '2. FIR vs IIR Mechanics', icon: SlidersHorizontal },
          { id: 'lpf_hpf', label: '3. Low-Pass vs High-Pass', icon: Activity },
          { id: 'fft_theory', label: '4. FFT & Spectral Impulse', icon: BarChart3 },
          { id: 'matrix', label: '5. Hazard Comparison Matrix', icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTopic === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTopic(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#5579A8] text-white shadow-xs font-semibold'
                  : 'bg-white text-[#5A6B82] border border-[#E2E6EC] hover:text-[#253247] hover:bg-[#F7F8FA]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TOPIC 1: POTHOLE DETECTION FROM FILTER GRAPH */}
      {activeTopic === 'pothole_filter' && (
        <div className="space-y-6">
          <div className="eng-card border-l-4 border-l-[#C62828]">
            <h2 className="text-base font-semibold text-[#253247] mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#C62828]" />
              How & Why We Determine There is a Pothole from the Filter Graph
            </h2>
            <p className="text-xs text-[#5A6B82] leading-relaxed">
              When viewing vertical chassis acceleration in the DSP Laboratory, a pothole is not just random noise. It follows a strict 3-phase physical shock response dictated by quarter-car vehicle suspension dynamics.
            </p>
          </div>

          {/* Waveform Diagram Card */}
          <div className="eng-card">
            <h3 className="text-sm font-semibold text-[#253247] mb-3">
              Anatomy of a Pothole Acceleration Waveform
            </h3>

            {/* Visual Waveform Sketch */}
            <div className="p-4 rounded-lg bg-[#1E293B] text-white font-mono text-xs overflow-x-auto space-y-2">
              <div className="text-[11px] text-[#94A3B8]">
                Vertical Acceleration a_z(t) over Time (Sampling fs = 100 Hz, Δt = 10 ms)
              </div>
              <div className="text-emerald-400">
                Baseline (0g) ────────────────┐                      ┌─────────────────
              </div>
              <div className="text-amber-300">
                &nbsp;                             \   Phase 1: Freefall  /  ▲ Phase 2: RIM STRIKE SPIKE
              </div>
              <div className="text-rose-400 font-bold">
                &nbsp;                              \   (Void Entry)     /   │ (+1.5g to +2.5g)
              </div>
              <div className="text-rose-400 font-bold">
                &nbsp;                               \                  /    │
              </div>
              <div className="text-rose-400 font-bold">
                &nbsp;                                ▼                 /     │      Phase 3: Wheel-Hop Ringdown
              </div>
              <div className="text-sky-300">
                &nbsp;                                 └───────────────┘      ▼      /\      /\
              </div>
              <div className="text-sky-300">
                &nbsp;                                  (-0.8g to -1.5g)              \/      \/ ─────
              </div>
            </div>

            {/* 3 Phases Detailed */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C62828] mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFEBEE] flex items-center justify-center text-[10px]">1</span>
                  Phase 1: Void De-weighting
                </div>
                <p className="text-[11px] text-[#5A6B82] leading-relaxed">
                  As the front tire rolls into the missing asphalt pocket, the ground drops away. Tire-road normal force collapses, causing chassis acceleration to plunge into negative values (<strong>-0.8g to -1.5g</strong>).
                </p>
              </div>

              <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C62828] mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#FFEBEE] flex items-center justify-center text-[10px]">2</span>
                  Phase 2: Violent Rim Strike
                </div>
                <p className="text-[11px] text-[#5A6B82] leading-relaxed">
                  The tire impacts the vertical opposing lip of the crater. The upward shock produces a sharp positive spike (<strong>+1.5g to +2.5g</strong>) with an extreme jerk rate (da/dt) in under 20–40 milliseconds.
                </p>
              </div>

              <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5579A8] mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#EDF2F7] flex items-center justify-center text-[10px]">3</span>
                  Phase 3: Resonant Ringdown
                </div>
                <p className="text-[11px] text-[#5A6B82] leading-relaxed">
                  The unsprung wheel mass bounces at its natural wheel-hop frequency (<strong>10–15 Hz</strong>) for 2–3 decaying cycles before returning to smooth highway baseline equilibrium.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Diagnostic Checklist */}
          <div className="eng-card">
            <h3 className="text-sm font-semibold text-[#253247] mb-3">
              Mathematical Markers Calculated on the Filter Graph
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC] space-y-1.5">
                <div className="font-semibold text-[#253247] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#5579A8]" />
                  Crest Factor (Peak-to-RMS Ratio &gt; 3.5)
                </div>
                <div className="font-mono text-[11px] text-[#5579A8]">C = Peak_abs / RMS</div>
                <p className="text-[#5A6B82] leading-relaxed text-[11px]">
                  On smooth roads or gentle humps, vibration energy is uniformly distributed (Crest Factor ~ 1.5–2.5). A pothole concentrates violent energy in a transient impulse, causing Crest Factor to spike above <strong>3.5 to 6.0</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC] space-y-1.5">
                <div className="font-semibold text-[#253247] flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-[#5579A8]" />
                  Peak-to-Peak Deflection (&gt; 3.0g)
                </div>
                <div className="font-mono text-[11px] text-[#5579A8]">V_pp = max(a_z) - min(a_z)</div>
                <p className="text-[#5A6B82] leading-relaxed text-[11px]">
                  The swing between the negative void bottom (-1.2g) and the positive rim strike impact (+2.2g) creates a massive peak-to-peak swing exceeding <strong>3.0g</strong> in under 150 milliseconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 2: FIR VS IIR MECHANICS */}
      {activeTopic === 'fir_iir' && (
        <div className="space-y-6">
          <div className="eng-card">
            <h2 className="text-base font-semibold text-[#253247] mb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#5579A8]" />
              FIR vs IIR Filters: What Governs the Filter Output?
            </h2>
            <p className="text-xs text-[#5A6B82] leading-relaxed">
              In digital signal processing, the mathematical formulation of the filter dictates how acceleration shocks are delayed, smoothed, or isolated in time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FIR Column */}
            <div className="eng-card space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E6EC] pb-2">
                <h3 className="text-sm font-bold text-[#5579A8]">FIR (Finite Impulse Response)</h3>
                <span className="badge-clean bg-[#EDF2F7] text-[#5579A8]">Linear Phase</span>
              </div>
              <div className="p-3 rounded bg-[#F7F8FA] font-mono text-[11px] text-[#253247]">
                y[n] = Σ b[k] · x[n-k] &nbsp; (k = 0 to M-1)
              </div>
              <ul className="space-y-2 text-xs text-[#5A6B82] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Feedforward Only:</strong> Depends solely on past and present inputs. Zero feedback loops means it is <em>strictly unconditionally stable</em>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Constant Group Delay:</strong> Symmetric coefficients (b[k] = b[M-1-k]) ensure all frequency components travel at the same velocity, preventing phase dispersion.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Zero-Phase Filtering:</strong> Forward-backward execution (<code>filtfilt</code>) completely cancels out filter delay, keeping the pothole peak synchronous with the true vehicle position.</span>
                </li>
              </ul>
            </div>

            {/* IIR Column */}
            <div className="eng-card space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E6EC] pb-2">
                <h3 className="text-sm font-bold text-[#2E7D32]">IIR (Butterworth SOS)</h3>
                <span className="badge-clean bg-[#E8F5E9] text-[#2E7D32]">Maximally Flat</span>
              </div>
              <div className="p-3 rounded bg-[#F7F8FA] font-mono text-[11px] text-[#253247]">
                y[n] = Σ b[k]·x[n-k] - Σ a[k]·y[n-k]
              </div>
              <ul className="space-y-2 text-xs text-[#5A6B82] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Feedback Poles:</strong> Uses past outputs to achieve sharp transition skirts with very few taps (e.g. order 4 vs FIR order 51).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Zero Passband Ripple:</strong> Butterworth topology is maximally flat in the passband—it does not alter the amplitude of vehicle vibrations below cutoff.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                  <span><strong>Second-Order Sections (SOS):</strong> Factored into cascaded 2nd-order biquads to prevent numerical instability from floating-point coefficient quantization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 3: LPF VS HPF */}
      {activeTopic === 'lpf_hpf' && (
        <div className="space-y-6">
          <div className="eng-card">
            <h2 className="text-base font-semibold text-[#253247] mb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#5579A8]" />
              Switching from Low-Pass to High-Pass: What Physically Occurs?
            </h2>
            <p className="text-xs text-[#5A6B82] leading-relaxed">
              Vehicle acceleration contains overlapping signals: low-frequency chassis movement and high-frequency pavement impact. Changing filter topology acts like an acoustic lens, isolating different physical phenomena.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="eng-card border-t-4 border-t-[#5579A8] space-y-3">
              <h3 className="text-sm font-bold text-[#253247]">Low-Pass Filter (LPF) Mode</h3>
              <div className="text-xs text-[#5579A8] font-semibold">Typical Cutoff: 10–12 Hz (Nyquist = 50 Hz)</div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                <strong>What it passes:</strong> Body heave, suspension pitch/roll, road slope, and vehicle mass inertia (0–5 Hz).
              </p>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                <strong>What it attenuates:</strong> High-frequency tire pavement noise, acoustic road-hiss, accelerometer electrical noise (&gt; 15 Hz).
              </p>
              <div className="p-3 rounded bg-[#F7F8FA] border border-[#E2E6EC] text-xs text-[#253247]">
                <strong>Effect on Pothole:</strong> Blurs and rounds off the sharp impact spike. Great for studying gross chassis suspension response, but suppresses the sharp transient edge needed for impact detection.
              </div>
            </div>

            <div className="eng-card border-t-4 border-t-[#C62828] space-y-3">
              <h3 className="text-sm font-bold text-[#253247]">High-Pass Filter (HPF) Mode</h3>
              <div className="text-xs text-[#C62828] font-semibold">Typical Cutoff: 15–20 Hz (Nyquist = 50 Hz)</div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                <strong>What it passes:</strong> Violent impacts, sharp pavement edges, wheel rim strikes, high-frequency shockwaves (15–50 Hz).
              </p>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                <strong>What it attenuates:</strong> Constant gravity (1g DC), road incline/grade, and slow chassis bounce.
              </p>
              <div className="p-3 rounded bg-[#FFEBEE] border border-[#FFCDD2] text-xs text-[#C62828]">
                <strong>Effect on Pothole:</strong> <em>The baseline becomes flat zero.</em> The gentle swaying of the car disappears completely, causing the violent pothole impact spike to <strong>erupt like a clear needle</strong>!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 4: FFT & SPECTRAL IMPULSE */}
      {activeTopic === 'fft_theory' && (
        <div className="space-y-6">
          <div className="eng-card border-l-4 border-l-[#5579A8]">
            <h2 className="text-base font-semibold text-[#253247] mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#5579A8]" />
              Fast Fourier Transform (FFT): Pothole Spectral Signature
            </h2>
            <p className="text-xs text-[#5A6B82] leading-relaxed">
              Why does an FFT reveal a pothole? In physics, a violent impact approximates a Dirac delta impulse δ(t). In the frequency domain, an impulse has a <strong>flat, infinitely wide spectrum</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="eng-card space-y-2.5">
              <h4 className="text-xs font-bold text-[#C62828] uppercase tracking-wide">Pothole (Impulse Shock)</h4>
              <div className="text-xl font-bold text-[#253247]">Broadband Surge</div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                Energy explodes across <strong>all frequencies</strong> up to the 50 Hz Nyquist limit. High-band energy (20–50 Hz) increases by 400–600%, shifting the <strong>Spectral Centroid</strong> to 18–28 Hz with high <strong>Spectral Spread</strong> (σ_f &gt; 10 Hz).
              </p>
            </div>

            <div className="eng-card space-y-2.5">
              <h4 className="text-xs font-bold text-[#E65100] uppercase tracking-wide">Speed Bump (Smooth Hump)</h4>
              <div className="text-xl font-bold text-[#253247]">Narrow Low-Freq Peak</div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                A speed bump is a smooth geometric profile that excites only the <strong>chassis body bounce resonance (1.5–4 Hz)</strong>. The FFT shows a tall, concentrated low-frequency peak with virtually zero energy above 10 Hz.
              </p>
            </div>

            <div className="eng-card space-y-2.5">
              <h4 className="text-xs font-bold text-[#2E7D32] uppercase tracking-wide">Smooth Highway (Baseline)</h4>
              <div className="text-xl font-bold text-[#253247]">Uniform Low Floor</div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">
                Uniformly low magnitude across all frequency bins with no prominent resonance spikes. Characterized by low total spectral power and modest spectral centroid (~5–8 Hz).
              </p>
            </div>
          </div>

          {/* Windowing Function Comparison */}
          <div className="eng-card">
            <h3 className="text-sm font-semibold text-[#253247] mb-3">
              Window Function Tradeoffs in FFT Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F8FA] text-[#5A6B82] border-b border-[#E2E6EC]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Window Function</th>
                    <th className="py-2.5 px-3 font-semibold">Side-lobe Peak</th>
                    <th className="py-2.5 px-3 font-semibold">Main-lobe Width</th>
                    <th className="py-2.5 px-3 font-semibold">Primary Telemetry Use Case</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6EC] text-[#253247]">
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Hann (Recommended)</td>
                    <td className="py-2.5 px-3 text-[#2E7D32] font-mono">-31.5 dB</td>
                    <td className="py-2.5 px-3 font-mono">8π / N</td>
                    <td className="py-2.5 px-3 text-[#5A6B82]">Best general balance: suppresses leakage while preserving suspension peaks.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Hamming</td>
                    <td className="py-2.5 px-3 font-mono">-42.5 dB</td>
                    <td className="py-2.5 px-3 font-mono">8π / N</td>
                    <td className="py-2.5 px-3 text-[#5A6B82]">Narrow main lobe: excellent for distinguishing two closely spaced resonance modes.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium">Blackman</td>
                    <td className="py-2.5 px-3 text-[#2E7D32] font-mono">-58.1 dB</td>
                    <td className="py-2.5 px-3 font-mono">12π / N</td>
                    <td className="py-2.5 px-3 text-[#5A6B82]">Maximum stopband attenuation: eliminates ghost artifacts near Nyquist boundary.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-[#C62828]">Rectangular (Boxcar)</td>
                    <td className="py-2.5 px-3 text-[#C62828] font-mono">-13.3 dB</td>
                    <td className="py-2.5 px-3 font-mono">4π / N</td>
                    <td className="py-2.5 px-3 text-[#5A6B82]">High spectral leakage; abrupt truncation creates artificial side-lobe ripples.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TOPIC 5: MASTER COMPARISON MATRIX */}
      {activeTopic === 'matrix' && (
        <div className="space-y-6">
          <div className="eng-card">
            <h2 className="text-base font-semibold text-[#253247] mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#5579A8]" />
              Master Road Hazard Diagnostic Matrix
            </h2>
            <p className="text-xs text-[#5A6B82] leading-relaxed">
              Comparison of time-domain filter signatures vs frequency-domain FFT fingerprints across all road conditions.
            </p>
          </div>

          <div className="eng-card overflow-x-auto p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F8FA] text-[#5A6B82] border-b border-[#E2E6EC]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Hazard Class</th>
                  <th className="py-3 px-4 font-semibold">Filter Waveform (HPF / LPF)</th>
                  <th className="py-3 px-4 font-semibold">Crest Factor</th>
                  <th className="py-3 px-4 font-semibold">Dominant Freq (Hz)</th>
                  <th className="py-3 px-4 font-semibold">FFT Spectral Profile</th>
                  <th className="py-3 px-4 font-semibold">Spectral Centroid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EC] text-[#253247]">
                <tr className="bg-[#FFEBEE]/30">
                  <td className="py-3 px-4 font-bold text-[#C62828] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C62828]" />
                    POTHOLE
                  </td>
                  <td className="py-3 px-4">Biphasic: void drop (-1.2g) $\to$ sharp rim strike (+2.2g)</td>
                  <td className="py-3 px-4 font-bold text-[#C62828] font-mono">&gt; 3.5 – 6.0</td>
                  <td className="py-3 px-4 font-mono">15 – 35 Hz</td>
                  <td className="py-3 px-4 text-[#C62828] font-medium">Broadband surge up to 50 Hz</td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#C62828]">18 – 28 Hz (High)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-[#E65100] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E65100]" />
                    SPEED BUMP
                  </td>
                  <td className="py-3 px-4">Smooth upward hump (+1.5g) $\to$ gradual settling</td>
                  <td className="py-3 px-4 font-mono">1.8 – 2.5</td>
                  <td className="py-3 px-4 font-mono font-semibold text-[#E65100]">1.5 – 4.0 Hz</td>
                  <td className="py-3 px-4 text-[#E65100]">Narrow low-frequency peak</td>
                  <td className="py-3 px-4 font-mono">2 – 5 Hz (Low)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-[#2E7D32] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
                    SMOOTH HIGHWAY
                  </td>
                  <td className="py-3 px-4">Low-noise continuous texture baseline (&lt; ±0.3g)</td>
                  <td className="py-3 px-4 font-mono">1.5 – 2.2</td>
                  <td className="py-3 px-4 font-mono text-[#8492A6]">Noise floor</td>
                  <td className="py-3 px-4 text-[#5A6B82]">Flat, minimal magnitude across all bins</td>
                  <td className="py-3 px-4 font-mono">5 – 10 Hz (Mid)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-[#5579A8] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5579A8]" />
                    EVASIVE SWERVE
                  </td>
                  <td className="py-3 px-4">Low vertical shock; strong lateral/roll deflection</td>
                  <td className="py-3 px-4 font-mono">1.4 – 2.0</td>
                  <td className="py-3 px-4 font-mono">0.5 – 2.0 Hz</td>
                  <td className="py-3 px-4 text-[#5579A8]">Sub-2 Hz steering oscillation</td>
                  <td className="py-3 px-4 font-mono">&lt; 3 Hz (Very Low)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
