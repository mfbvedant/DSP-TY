import React, { useState, useEffect } from 'react';
import { fetchStatus, SystemStatus } from './api';
import { Navbar } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { DSPLabPage } from './pages/DSPLabPage';
import { FFTAnalyzerPage } from './pages/FFTAnalyzerPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { AboutPage } from './pages/AboutPage';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetchStatus()
      .then((data) => setStatus(data))
      .catch((err) => console.error('Status fetch error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#080D18] text-[#F4F7FB] flex flex-col font-['Inter']">
      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} status={status} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-6">
        {activeTab === 'overview' && (
          <OverviewPage onNavigate={(tab) => setActiveTab(tab)} status={status} />
        )}
        {activeTab === 'monitoring' && <MonitoringPage />}
        {activeTab === 'dsp_lab' && <DSPLabPage />}
        {activeTab === 'fft' && <FFTAnalyzerPage />}
        {activeTab === 'model' && <ModelEvaluationPage />}
        {activeTab === 'about' && <AboutPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2E48] bg-[#0A0E1A] py-6 text-xs text-[#95A4BA] font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00D4FF] font-bold">RoadSense AI</span>
            <span>// Third-Year Electronics & Telecommunication DSP Mini-Project</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI Backend :8000</span>
            <span>React + Vite :3000</span>
            <span className="text-[#10B981]">● Systems Nominal</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
