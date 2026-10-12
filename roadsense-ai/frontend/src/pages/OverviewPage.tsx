import React from 'react';
import { ArrowRight, Activity, Sliders, BarChart3, ShieldCheck, ChevronRight } from 'lucide-react';
import { SystemStatus } from '../api';

interface OverviewPageProps {
  onNavigate: (tab: string) => void;
  status: SystemStatus | null;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, status }) => {
  return (
    <div className="space-y-10 pb-16">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden border border-[#1E2E48] bg-[#101827]">
        {/* Background photo */}
        <img
          src="/assets/hero_highway.jpg"
          alt="Automotive Highway Telemetry"
          className="w-full h-[400px] object-cover opacity-35 filter contrast-125"
        />

        {/* Laser scanline motion */}
        <div className="scanline-effect" />

        {/* Hero Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080D18] via-[#080D18]/80 to-transparent p-8 md:p-12 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-3">
            <span className="hud-pill pill-cyan">AUTOMOTIVE DSP TELEMETRY</span>
            <span className="hud-pill pill-amber">EDGE ROAD SURVEILLANCE</span>
          </div>

          <h1 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white tracking-tight mb-3">
            Understand the Road Before It Becomes a Risk.
          </h1>

          <p className="text-[#BBC9CF] text-base md:text-lg max-w-2xl leading-relaxed mb-6 font-['Inter']">
            RoadSense AI transforms high-frequency vehicle vibration signals into actionable road surface diagnostics using Discrete Fourier Transforms, digital FIR/IIR filtering, statistical feature engineering, and trained machine learning classifiers.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('monitoring')}
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-[#00D4FF] text-[#080D18] font-['Space_Grotesk'] font-bold text-sm hover:brightness-110 shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-all"
            >
              <Activity className="w-4 h-4" />
              Launch Monitoring Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('dsp_lab')}
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-[#101827] border border-[#1E2E48] text-[#00D4FF] font-['Space_Grotesk'] font-semibold text-sm hover:border-[#00D4FF] hover:bg-[#141E30] transition-all"
            >
              <Sliders className="w-4 h-4" />
              Explore DSP Laboratory
            </button>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡</span> Core Engineering Capabilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cockpit-card">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-1.5">Road Classification</h3>
            <p className="text-xs text-[#95A4BA] leading-relaxed">
              Supervised Random Forest & SVM models classifying road profiles into Smooth, Rough, and Pothole events with leakage-free group validation.
            </p>
          </div>

          <div className="cockpit-card">
            <div className="text-3xl mb-3">🎛️</div>
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-1.5">FIR & IIR Digital Filters</h3>
            <p className="text-xs text-[#95A4BA] leading-relaxed">
              Windowed-sinc FIR and Butterworth Second-Order Sections (SOS) with zero-phase bidirectional filtering preserving peak transient alignment.
            </p>
          </div>

          <div className="cockpit-card">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-1.5">FFT Spectral Analysis</h3>
            <p className="text-xs text-[#95A4BA] leading-relaxed">
              Single-sided Discrete Fourier Transform with Hann/Hamming windowing, spectral centroid, spectral spread, and dominant resonant peak tracking.
            </p>
          </div>

          <div className="cockpit-card">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-1.5">Vibration Telemetry</h3>
            <p className="text-xs text-[#95A4BA] leading-relaxed">
              Multi-channel IMU acceleration profiling: RMS energy, Crest Factor impulsiveness, peak-to-peak amplitude, and baseline gravity decoupling.
            </p>
          </div>
        </div>
      </div>

      {/* End-to-End Pipeline */}
      <div className="cockpit-card">
        <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white mb-4">
          📐 7-Stage Digital Signal Processing Pipeline
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { step: '01', title: 'IMU Dataset', desc: '100 Hz CSV Telemetry' },
            { step: '02', title: 'Preprocessing', desc: 'Detrending & Windows' },
            { step: '03', title: 'DSP Filters', desc: 'FIR / IIR Butterworth' },
            { step: '04', title: 'FFT Transform', desc: 'Single-Sided Spectrum' },
            { step: '05', title: 'Feature Extract', desc: 'RMS, Peak, Centroid' },
            { step: '06', title: 'ML Classifier', desc: 'Random Forest / SVM' },
            { step: 'OUT', title: 'Road Condition', desc: 'Pothole Alert / Severity', highlight: true },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border text-center transition-all ${
                item.highlight
                  ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'
                  : 'bg-[#101827] border-[#1E2E48] text-[#DEE2F2]'
              }`}
            >
              <div className="font-mono text-[10px] text-[#00D4FF] mb-1">STAGE {item.step}</div>
              <div className="font-['Space_Grotesk'] text-xs font-bold">{item.title}</div>
              <div className="text-[10px] text-[#95A4BA] mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Road Profile Photography Cards */}
      <div>
        <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📸</span> Road Condition Surface Profiles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="cockpit-card">
            <img
              src="/assets/smooth_road.jpg"
              alt="Smooth Road"
              className="w-full h-36 object-cover rounded mb-3 border border-[#1E2E48]"
            />
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-['Space_Grotesk'] font-bold text-sm text-[#10B981]">SMOOTH HIGHWAY</span>
              <span className="hud-pill pill-green text-[10px]">LOW RMS</span>
            </div>
            <p className="text-xs text-[#95A4BA]">
              Low RMS acceleration (&lt;0.08g), minimal high-frequency spectral power, nominal suspension deflection.
            </p>
          </div>

          <div className="cockpit-card">
            <img
              src="/assets/rough_road.jpg"
              alt="Rough Road"
              className="w-full h-36 object-cover rounded mb-3 border border-[#1E2E48]"
            />
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-['Space_Grotesk'] font-bold text-sm text-[#FFB547]">ROUGH PAVEMENT</span>
              <span className="hud-pill pill-amber text-[10px]">ELEVATED CHATTER</span>
            </div>
            <p className="text-xs text-[#95A4BA]">
              Continuous stochastic vibration with broad spectral spread, moderate RMS (0.15g – 0.35g), constant chassis chatter.
            </p>
          </div>

          <div className="cockpit-card">
            <img
              src="/assets/pothole_road.jpg"
              alt="Pothole Damage"
              className="w-full h-36 object-cover rounded mb-3 border border-[#1E2E48]"
            />
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-['Space_Grotesk'] font-bold text-sm text-[#FF5364]">POTHOLE-LIKE EVENT</span>
              <span className="hud-pill pill-red text-[10px]">TRANSIENT SHOCK</span>
            </div>
            <p className="text-xs text-[#95A4BA]">
              High Crest Factor (&gt;4.0), high peak-to-peak deflection, asymmetric negative dip followed by sharp rebound spike.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
