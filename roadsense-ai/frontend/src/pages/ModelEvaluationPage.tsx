import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, ShieldCheck, Database, Award, ArrowUpRight } from 'lucide-react';
import { fetchEvaluation, retrainModel, EvaluationResponse } from '../api';

export const ModelEvaluationPage: React.FC = () => {
  const [evalData, setEvalData] = useState<EvaluationResponse | null>(null);
  const [retraining, setRetraining] = useState<boolean>(false);
  const [retrainWinDur, setRetrainWinDur] = useState<number>(0.5);
  const [retrainOverlap, setRetrainOverlap] = useState<number>(0.5);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadMetrics = () => {
    fetchEvaluation().then((res) => setEvalData(res)).catch(() => {});
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRetrain = () => {
    setRetraining(true);
    setSuccessMsg(null);

    retrainModel({
      window_duration_s: retrainWinDur,
      overlap: retrainOverlap,
    })
      .then((res) => {
        setRetraining(false);
        setSuccessMsg(`Retraining Complete! Selected Best Model: ${res.best_model} across ${res.total_windows} extracted windows.`);
        loadMetrics();
      })
      .catch((err) => {
        setRetraining(false);
        alert(`Retraining failed: ${err.message}`);
      });
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Title */}
      <div className="border-b border-[#1E2E48] pb-4">
        <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          🤖 Machine Learning Model Evaluation
        </h1>
        <p className="text-xs text-[#95A4BA] mt-0.5">
          Benchmark Random Forest and Support Vector Machine classifiers evaluated on DSP feature representations.
        </p>
      </div>

      {/* Retrain Controls Accordion */}
      <div className="cockpit-card bg-[#101827]/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#00D4FF]" />
              Model Retraining Console
            </h3>
            <p className="text-xs text-[#95A4BA] mt-0.5">
              Extract fresh 16-parameter time & frequency vectors and re-fit classifiers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#95A4BA]">Window:</span>
              <select
                value={retrainWinDur}
                onChange={(e) => setRetrainWinDur(parseFloat(e.target.value))}
                className="bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-2.5 py-1.5 font-mono"
              >
                <option value="0.25">0.25 s</option>
                <option value="0.5">0.50 s</option>
                <option value="1.0">1.00 s</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#95A4BA]">Overlap:</span>
              <select
                value={retrainOverlap}
                onChange={(e) => setRetrainOverlap(parseFloat(e.target.value))}
                className="bg-[#101827] border border-[#1E2E48] text-white text-xs rounded px-2.5 py-1.5 font-mono"
              >
                <option value="0.0">0.0 (No overlap)</option>
                <option value="0.5">0.5 (50% overlap)</option>
                <option value="0.75">0.75 (75% overlap)</option>
              </select>
            </div>

            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="flex items-center gap-2 px-4 py-1.5 rounded bg-[#00D4FF] text-[#080D18] font-['Space_Grotesk'] font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(0,212,255,0.3)]"
            >
              {retraining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Fitting Models...
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  Retrain Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mt-3 p-2.5 rounded bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-mono">
            ✅ {successMsg}
          </div>
        )}
      </div>

      {/* Model Benchmark Comparison Table */}
      {evalData && evalData.metrics.length > 0 && (
        <div className="cockpit-card">
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#00D4FF]" />
            Classifier Performance Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#1E2E48] text-[#95A4BA] bg-[#101827]">
                  <th className="py-2.5 px-4 font-semibold">MODEL ARCHITECTURE</th>
                  <th className="py-2.5 px-4 font-semibold">ACCURACY</th>
                  <th className="py-2.5 px-4 font-semibold">WEIGHTED PRECISION</th>
                  <th className="py-2.5 px-4 font-semibold">WEIGHTED RECALL</th>
                  <th className="py-2.5 px-4 font-semibold">F1-SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]/50">
                {evalData.metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#101827]/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00D4FF]" />
                      {m.Model}
                    </td>
                    <td className="py-3 px-4 text-[#00D4FF] font-semibold">{(m.Accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-[#DEE2F2]">{(m.Precision * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-[#DEE2F2]">{(m.Recall * 100).toFixed(1)}%</td>
                    <td className="py-3 px-4 text-[#10B981] font-bold">{(m['F1-Score'] * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Class Classification Report */}
      {evalData?.classification_report && (
        <div className="cockpit-card">
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-white mb-3">
            📋 Detailed Per-Class Classification Report
          </h3>
          <pre className="p-4 rounded bg-[#080D18] border border-[#1E2E48] text-[#00D4FF] font-mono text-xs overflow-x-auto leading-relaxed">
            {evalData.classification_report}
          </pre>
        </div>
      )}

      {/* Data Leakage Mitigation Architecture */}
      <div className="cockpit-card">
        <h3 className="font-['Space_Grotesk'] text-base font-bold text-[#FFB547] mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          Strict Run-Level Group Splitting (Data Leakage Mitigation)
        </h3>
        <p className="text-xs text-[#CBD5E1] leading-relaxed">
          Standard random train/test shuffling in sliding-window time series results in extreme <strong>data leakage</strong>: overlapping time segments from the same continuous vehicle run appear in both train and test partitions.
          RoadSense AI strictly enforces <strong>GroupKFold / Leave-Group-Out validation by <code>run_id</code></strong>.
          Complete simulation runs are held out entirely during test evaluation, verifying that the model generalizes to unseen road stretches rather than memorizing localized transient overlaps.
        </p>
      </div>
    </div>
  );
};
