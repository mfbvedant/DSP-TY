import React, { useState, useEffect } from 'react';
import { fetchStatus, SystemStatus, UserSignalData } from './api';
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
  const [userSignal, setUserSignal] = useState<UserSignalData | null>(null);

  useEffect(() => {
    fetchStatus()
      .then((data) => setStatus(data))
      .catch((err) => console.error('Status fetch error:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#253247] flex flex-col">
      {/* Clean Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} status={status} hasUserSignal={!!userSignal} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12">
        {activeTab === 'overview' && (
          <OverviewPage
            onNavigate={(tab) => setActiveTab(tab)}
            status={status}
            onSignalAnalyzed={setUserSignal}
          />
        )}
        {activeTab === 'monitoring' && <MonitoringPage userSignal={userSignal} />}
        {activeTab === 'dsp_lab' && <DSPLabPage userSignal={userSignal} />}
        {activeTab === 'fft' && <FFTAnalyzerPage userSignal={userSignal} />}
        {activeTab === 'model' && <ModelEvaluationPage />}
        {activeTab === 'about' && <AboutPage />}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#E2E6EC] bg-white py-4 text-xs text-[#5A6B82]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-[#253247]">RoadSense AI</span> — Third-Year Electronics & Telecommunication Engineering DSP Project
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#8492A6]">
            <span>FastAPI Server :8000</span>
            <span>React Production Client</span>
            <span>100 Hz IMU Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
