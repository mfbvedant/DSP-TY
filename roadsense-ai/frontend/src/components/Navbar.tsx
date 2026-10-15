import React from 'react';
import {
  LayoutDashboard,
  Activity,
  SlidersHorizontal,
  BarChart3,
  Cpu,
  Info,
} from 'lucide-react';
import { SystemStatus } from '../api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemStatus | null;
  hasUserSignal?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, status, hasUserSignal }) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Road Monitoring', icon: Activity },
    { id: 'dsp_lab', label: 'DSP Laboratory', icon: SlidersHorizontal },
    { id: 'fft', label: 'FFT Analyzer', icon: BarChart3 },
    { id: 'model', label: 'Model Evaluation', icon: Cpu },
    { id: 'about', label: 'About Project', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E6EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div
          className="flex items-center gap-3 cursor-pointer shrink-0"
          onClick={() => setActiveTab('overview')}
        >
          <div className="w-8 h-8 rounded bg-[#5579A8] text-white flex items-center justify-center font-bold text-sm">
            RS
          </div>
          <div>
            <div className="text-base font-semibold text-[#253247] tracking-tight flex items-center gap-2 leading-none">
              RoadSense AI
            </div>
            <div className="text-xs text-[#5A6B82] mt-1 leading-none">
              Intelligent Road Condition Monitoring
            </div>
          </div>
        </div>

        {/* Compact Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#EDF2F7] text-[#5579A8] font-semibold border border-[#D0DCEB]'
                    : 'text-[#5A6B82] hover:text-[#253247] hover:bg-[#F1F4F8]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5579A8]' : 'text-[#8492A6]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Discreet System Status */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-[#5A6B82] shrink-0 border-l border-[#E2E6EC] pl-4">
          {hasUserSignal && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#E8F5E9] border border-[#A5D6A7]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
              <span className="font-semibold text-[#2E7D32] text-[11px]">Signal Loaded</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status ? 'bg-[#2E7D32]' : 'bg-[#B78103]'
              }`}
            />
            <span className="font-medium text-[#253247]">
              {status ? `${status.sampling_frequency_hz} Hz Online` : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
