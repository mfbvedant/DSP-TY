import React from 'react';
import { BookOpen, AlertCircle, Layers, ShieldCheck, Activity } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-[#E2E6EC] pb-4">
        <h1 className="text-xl font-bold text-[#253247] tracking-tight">
          About RoadSense AI
        </h1>
        <p className="text-xs text-[#5A6B82] mt-0.5">
          Digital Signal Processing Mini-Project — Third-Year Electronics & Telecommunication Engineering.
        </p>
      </div>

      {/* Abstract and Suspension Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 eng-card space-y-3">
          <h2 className="text-sm font-semibold text-[#253247] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#5579A8]" />
            Project Abstract & Problem Statement
          </h2>
          <p className="text-xs text-[#5A6B82] leading-relaxed">
            Road surface degradation, potholes, and abrupt pavement hazards compromise vehicular safety, causing wheel rim buckling, suspension fatigue, and tire blowout incidents. Conventional visual road surveillance methods (such as optical cameras and computer vision) suffer from lighting degradation, rain occlusion, high computational demands, and privacy constraints.
          </p>
          <p className="text-xs text-[#5A6B82] leading-relaxed">
            <strong className="text-[#253247]">RoadSense AI</strong> investigates direct tactile inertial sensing using vehicle-borne accelerometer telemetry. By combining classic Digital Signal Processing (discrete sampling validation, baseline detrending, windowed-sinc FIR and Butterworth SOS digital filtering, and single-sided FFT analysis) with machine-learning feature classification, the system identifies and categorizes road profiles (Smooth, Rough, Pothole) with low computational overhead and high repeatability.
          </p>
        </div>

        <div className="eng-card">
          <img
            src="/assets/vehicle_suspension.jpg"
            alt="Vehicle Suspension Dynamics"
            className="w-full h-36 object-cover rounded mb-3 border border-[#E2E6EC]"
          />
          <h3 className="text-xs font-semibold text-[#253247] mb-1">
            2-DOF Quarter-Car Dynamics
          </h3>
          <p className="text-[11px] text-[#5A6B82] leading-relaxed">
            Models sprung chassis mass ($m_s$) and unsprung wheel mass ($m_u$). Captures body heave resonance (1–3 Hz) and wheel-hop resonance (10–15 Hz) excited by road roughness.
          </p>
        </div>
      </div>

      {/* Core DSP Concepts Demonstrated */}
      <div className="eng-card">
        <h2 className="text-sm font-semibold text-[#253247] mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#5579A8]" />
          Key Digital Signal Processing Concepts Covered
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              1. Sampling & Nyquist Theorem
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Discrete sampling at fs = 100 Hz yields a Nyquist limit of 50 Hz. Signal components beyond 50 Hz must be suppressed to avoid spectral aliasing back into chassis resonance modes.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              2. FIR Filter Design
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Windowed-sinc impulse response implemented using Hamming tapering. Guarantees strictly linear phase and constant group delay, preventing temporal distortion of sharp pothole impact transients.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              3. IIR Butterworth (SOS)
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Maximally flat passband response with steep roll-off characteristics. Factored into cascaded Second-Order Sections (SOS) to prevent numerical instability from finite-precision polynomial quantization.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              4. Zero-Phase Filtering
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Forward-backward bidirectional filtering (<code>sosfiltfilt</code>) cancels out all phase distortion, ensuring processed acceleration peaks align synchronously with true road surface impact events.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              5. Windowing & Spectral Leakage
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Applying smooth tapering windows (Hann, Hamming, Blackman) attenuates artificial step discontinuities at rectangular window boundaries, drastically reducing side-lobe spectral leakage in FFT transforms.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#F7F8FA] border border-[#E2E6EC]">
            <h4 className="font-semibold text-[#253247] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5579A8]" />
              6. Statistical Feature Moments
            </h4>
            <p className="text-[#5A6B82] leading-relaxed text-[11px]">
              Feature vectors combine time-domain statistics (RMS, Crest Factor, peak-to-peak amplitude) and frequency-domain statistics (Spectral Centroid, spectral spread, sub-band energies) to train robust classifiers.
            </p>
          </div>
        </div>
      </div>

      {/* Synthetic Dataset Disclosure */}
      <div className="p-4 rounded bg-[#FFFBEB] border border-[#FDE68A] space-y-1.5">
        <div className="flex items-center gap-2 text-[#92400E] font-semibold text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Synthetic Physics Simulation Disclosure
        </div>
        <p className="text-xs text-[#78350F] leading-relaxed">
          The dataset utilized in this project was generated through an Euler-Cromer numerical integration of a <strong>2-Degree-of-Freedom (2-DOF) quarter-car mass-spring-damper vehicle suspension model</strong> with calibrated accelerometer sensor noise.
          The dataset demonstrates foundational DSP and vibration dynamics without claiming to be raw field recordings from an instrumented road test vehicle.
        </p>
      </div>
    </div>
  );
};
