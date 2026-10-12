import React from 'react';
import { BookOpen, Cpu, ShieldAlert, Layers, CheckCircle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="border-b border-[#1E2E48] pb-4">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          ℹ️ About RoadSense AI
        </h1>
        <p className="text-xs text-[#95A4BA] mt-0.5">
          Digital Signal Processing Mini-Project — Third Year Electronics and Telecommunication Engineering.
        </p>
      </div>

      {/* Abstract and Suspension Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 cockpit-card space-y-3">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#00D4FF] flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Project Abstract & Problem Statement
          </h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Road surface degradation, potholes, and abrupt pavement hazards compromise vehicular safety, causing wheel rim buckling, suspension fatigue, and tire blowout incidents. Visual road surveillance methods (computer vision, camera footage) suffer from lighting degradation, rain occlusion, and computational overhead.
          </p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            <strong>RoadSense AI</strong> investigates direct tactile inertial sensing using vehicle-borne accelerometer telemetry. By combining classic Digital Signal Processing (sampling verification, baseline detrending, windowed-sinc FIR / Butterworth SOS digital filtering, and single-sided FFT analysis) with machine-learning feature classification, the system identifies and categorizes road profiles with microsecond latency.
          </p>
        </div>

        <div className="cockpit-card">
          <img
            src="/assets/vehicle_suspension.jpg"
            alt="Vehicle Suspension Dynamics"
            className="w-full h-36 object-cover rounded mb-3 border border-[#1E2E48]"
          />
          <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-1">
            2-DOF Quarter-Car Dynamics
          </h3>
          <p className="text-[11px] text-[#95A4BA] leading-relaxed">
            Captures body heave resonance (1–3 Hz) and unsprung wheel-hop mode (10–15 Hz) excited by road profile roughness.
          </p>
        </div>
      </div>

      {/* Core DSP Concepts Demonstrated */}
      <div className="cockpit-card">
        <h2 className="font-['Space_Grotesk'] text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00D4FF]" />
          Key Digital Signal Processing Concepts Covered
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">1. Sampling & Nyquist Criterion</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Discrete sampling at fs = 100 Hz yields a Nyquist limit of 50 Hz. Signal frequencies beyond 50 Hz must be rejected to prevent spectral aliasing into the chassis resonance band.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">2. FIR Filter Design</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Windowed-sinc impulse response via Hamming window. Guarantees strictly linear phase, preventing group delay distortion that would artificially shift pothole impact peaks.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">3. IIR Butterworth (SOS)</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Maximally flat passband response with steep roll-off. Implemented as Second-Order Sections (SOS) to avoid high-order polynomial coefficient quantization drift.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">4. Zero-Phase Filtering</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Forward-backward bidirectional filtering (sosfiltfilt) eliminates phase lag, ensuring processed acceleration peaks align exactly with true vehicle displacement.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">5. Windowing & Spectral Leakage</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Applying bell-shaped tapering windows (Hann, Hamming, Blackman) attenuates abrupt rectangular boundary steps, suppressing side-lobe leakage in the FFT spectrum.
            </p>
          </div>

          <div className="p-3.5 rounded bg-[#101827] border border-[#1E2E48]">
            <h4 className="font-bold text-[#00D4FF] mb-1">6. Statistical Feature Moments</h4>
            <p className="text-[#95A4BA] leading-relaxed">
              Root Mean Square (RMS) energy, Crest Factor (impulsive shock ratio), Spectral Centroid (frequency center-of-mass), and multi-band energy distributions.
            </p>
          </div>
        </div>
      </div>

      {/* Synthetic Dataset Disclosure */}
      <div className="p-5 rounded-lg bg-[#FFB547]/10 border border-[#FFB547]/40 space-y-2">
        <div className="flex items-center gap-2 text-[#FFB547] font-['Space_Grotesk'] font-bold text-sm">
          <ShieldAlert className="w-5 h-5" />
          Synthetic Physics Simulation Disclosure
        </div>
        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          The dataset used in this project was generated using an Euler-Cromer numerical simulation of a <strong>2-Degree-of-Freedom (2-DOF) quarter-car mass-spring-damper vehicle suspension model</strong> with simulated MEMS accelerometer sensor noise.
          The dataset does <strong>not</strong> represent physical in-cabin sensor recordings from an on-road instrumented vehicle. While the physics equations capture suspension resonance and tire rebound accurately, real-world deployment requires field calibration for vehicle wheelbase, speed variations, and sensor mounting compliance.
        </p>
      </div>
    </div>
  );
};
