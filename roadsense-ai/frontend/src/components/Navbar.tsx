import React from 'react';
import { Activity, Cpu, Sliders, BarChart3, Info, Radio, Database } from 'lucide-react';
import { SystemStatus } from '../api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, status }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'monitoring', label: 'Road Monitoring', icon: Activity },
    { id: 'dsp_lab', label: 'DSP Laboratory', icon: Sliders },
    { id: 'fft', label: 'FFT Analyzer', icon: BarChart3 },
    { id: 'model', label: 'Model Evaluation', icon: Cpu },
    { id: 'about', label: 'About Project', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080D18]/90 backdrop-blur-md border-b border-[#1E2E48]">
      {/* Top HUD Telemetry Strip */}
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between text-xs font-mono text-[#95A4BA] border-b border-[#1E2E48]/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] pulse-dot-anim" />
            <span className="text-[#DEE2F2]">IMU SAMPLING:</span>
            <span className="text-[#00D4FF] font-semibold">{status ? `${status.sampling_frequency_hz} Hz` : '100 Hz'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[#DEE2F2]">NYQUIST:</span>
            <span className="text-[#00D4FF] font-semibold">{status ? `${status.nyquist_frequency_hz} Hz` : '50 Hz'}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-[#DEE2F2]">DATASET SAMPLES:</span>
            <span className="text-[#00D4FF] font-semibold">{status ? status.total_samples.toLocaleString() : '1,001'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#DEE2F2]">MODEL STATUS:</span>
            <span className={`font-semibold ${status?.model_loaded ? 'text-[#10B981]' : 'text-[#FFB547]'}`}>
              {status?.model_loaded ? 'LOADED // READY' : 'TRAINING REQUIRED'}
            </span>
          </div>
          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#FFB547]/10 text-[#FFB547] border border-[#FFB547]/30">
            Synthetic Physics Data
          </span>
        </div>
      </div>

      {/* Main Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#00D4FF] to-[#477BFF] flex items-center justify-center text-xl shadow-[0_0_16px_rgba(0,212,255,0.4)]">
            🛣️
          </div>
          <div>
            <div className="font-['Space_Grotesk'] text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              RoadSense AI
              <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30">
                v2.4
              </span>
            </div>
            <div className="text-[11px] text-[#95A4BA] italic font-['Space_Grotesk']">
              "Every Vibration Tells a Story."
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-['Space_Grotesk'] font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#141E30] text-[#00D4FF] border border-[#00D4FF]/40 shadow-[0_0_12px_rgba(0,212,255,0.15)]'
                    : 'text-[#95A4BA] hover:text-[#F4F7FB] hover:bg-[#101827]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00D4FF]' : 'text-[#95A4BA]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
