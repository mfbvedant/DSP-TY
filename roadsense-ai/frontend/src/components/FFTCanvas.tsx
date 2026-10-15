import React, { useRef, useEffect, useState } from 'react';
import { BarChart3, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';

interface FFTCanvasProps {
  freqs: number[];
  magnitude: number[];
  dominantFreq?: number;
  nyquistFreq?: number;
  title?: string;
  height?: number;
  showPotholeLabels?: boolean;
}

export const FFTCanvas: React.FC<FFTCanvasProps> = ({
  freqs,
  magnitude,
  dominantFreq,
  nyquistFreq = 50.0,
  title = 'Spectral Magnitude Spectrum (FFT)',
  height = 280,
  showPotholeLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic Spectral Diagnostics
  const [spectralDiag, setSpectralDiag] = useState<{
    label: string;
    sublabel: string;
    type: 'pothole' | 'speed_bump' | 'smooth' | 'suspension';
    peakFreq: number;
    centroid: number;
    highBandRatio: number;
    totalPower: number;
  }>({
    label: 'Analyzing Frequency Spectrum...',
    sublabel: '',
    type: 'smooth',
    peakFreq: 0,
    centroid: 0,
    highBandRatio: 0,
    totalPower: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || magnitude.length === 0 || freqs.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const n = freqs.length;

    // 1. Calculate Spectral Descriptors & Band Energy
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let totalEnergy = 0;
    let sumFMag = 0;
    let sumMag = 0;
    let maxMagIdx = 0;
    let maxMagVal = -1;

    for (let i = 0; i < n; i++) {
      const f = freqs[i];
      const m = magnitude[i];
      const p = m * m;

      totalEnergy += p;
      sumFMag += f * m;
      sumMag += m;

      if (m > maxMagVal && f > 0.1) {
        maxMagVal = m;
        maxMagIdx = i;
      }

      if (f <= 5.0) {
        lowEnergy += p;
      } else if (f <= 20.0) {
        midEnergy += p;
      } else {
        highEnergy += p;
      }
    }

    const calculatedPeak = dominantFreq !== undefined && dominantFreq > 0 ? dominantFreq : freqs[maxMagIdx] || 0;
    const centroid = sumMag > 0 ? sumFMag / sumMag : 0;
    const highBandRatio = totalEnergy > 0 ? highEnergy / totalEnergy : 0;
    const midBandRatio = totalEnergy > 0 ? midEnergy / totalEnergy : 0;
    const lowBandRatio = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;

    // Spectral Classification:
    // Pothole: excites wheel-hop (8-16 Hz) with broad high-band tail (20-50 Hz)
    let diagType: 'pothole' | 'speed_bump' | 'smooth' | 'suspension' = 'smooth';
    let diagLabel = 'SMOOTH ROAD SPECTRUM';
    let diagSublabel = `Uniform baseline floor (Centroid: ${centroid.toFixed(1)} Hz, High-Band: ${(highBandRatio * 100).toFixed(0)}%).`;

    if ((highBandRatio > 0.12 || centroid > 14.0) && totalEnergy > 0.05) {
      diagType = 'pothole';
      diagLabel = 'POTHOLE SPECTRAL SIGNATURE (BROADBAND SHOCK)';
      diagSublabel = `Transient impact excites wheel-hop (${calculatedPeak.toFixed(1)} Hz) and high-frequency harmonics (20–50 Hz: ${(highBandRatio * 100).toFixed(0)}% energy).`;
    } else if (calculatedPeak <= 5.0 && lowBandRatio > 0.45 && totalEnergy > 0.04) {
      diagType = 'speed_bump';
      diagLabel = 'SPEED BUMP RESONANCE PROFILE';
      diagSublabel = `Energy concentrated in sprung body bounce mode (${calculatedPeak.toFixed(1)} Hz). Negligible high-band content (${(highBandRatio * 100).toFixed(0)}%).`;
    } else if (calculatedPeak > 5.0 && calculatedPeak <= 20.0) {
      diagType = 'suspension';
      diagLabel = 'SUSPENSION WHEEL-HOP RESONANCE';
      diagSublabel = `Dominant quarter-car wheel bounce mode at ${calculatedPeak.toFixed(1)} Hz. Moderate energy distribution.`;
    }

    setSpectralDiag({
      label: diagLabel,
      sublabel: diagSublabel,
      type: diagType,
      peakFreq: calculatedPeak,
      centroid,
      highBandRatio,
      totalPower: totalEnergy,
    });

    // 2. High-DPI Canvas Rendering
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Light Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 3. Draw Colored Frequency Band Zones (Subtle engineering stripes)
    const x5Hz = (5.0 / nyquistFreq) * width;
    const x20Hz = (20.0 / nyquistFreq) * width;

    // Band 1: 0-5 Hz (Body Bounce)
    ctx.fillStyle = 'rgba(232, 245, 233, 0.45)';
    ctx.fillRect(0, 0, x5Hz, height);

    // Band 2: 5-20 Hz (Wheel Hop)
    ctx.fillStyle = 'rgba(237, 242, 247, 0.45)';
    ctx.fillRect(x5Hz, 0, x20Hz - x5Hz, height);

    // Band 3: 20-50 Hz (Impact & Texture)
    ctx.fillStyle = 'rgba(254, 242, 242, 0.45)';
    ctx.fillRect(x20Hz, 0, width - x20Hz, height);

    // Zone Division Lines
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x5Hz, 0);
    ctx.lineTo(x5Hz, height);
    ctx.moveTo(x20Hz, 0);
    ctx.lineTo(x20Hz, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zone Title Headers at the top of bands
    ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#2E7D32';
    ctx.fillText('0-5 Hz: BODY HEAVE', 8, 14);

    ctx.fillStyle = '#5579A8';
    ctx.fillText('5-20 Hz: WHEEL HOP RESONANCE', x5Hz + 8, 14);

    ctx.fillStyle = '#C62828';
    ctx.fillText('20-50 Hz: POTHOLE IMPULSE & TEXTURE', x20Hz + 8, 14);

    // Subtle Gridlines
    ctx.strokeStyle = '#EEF2F6';
    ctx.lineWidth = 1;

    const numY = 6;
    for (let i = 0; i <= numY; i++) {
      const y = (height / numY) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const numX = 10;
    for (let i = 0; i <= numX; i++) {
      const x = (width / numX) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const maxMag = Math.max(0.01, ...magnitude) * 1.18;

    // Gradient Area Fill under Spectrum
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(85, 121, 168, 0.22)');
    grad.addColorStop(1, 'rgba(85, 121, 168, 0.02)');

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < n; i++) {
      const x = (freqs[i] / nyquistFreq) * width;
      const y = height * (1 - magnitude[i] / maxMag);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Spectrum Trace Line
    ctx.strokeStyle = '#5579A8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (freqs[i] / nyquistFreq) * width;
      const y = height * (1 - magnitude[i] / maxMag);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 4. Dominant Frequency Peak Indicator & Mode Label
    if (calculatedPeak > 0) {
      const peakX = (calculatedPeak / nyquistFreq) * width;
      const peakMagAtX = maxMagVal;
      const peakY = height * (1 - peakMagAtX / maxMag);

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#C62828';
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(peakX, 0);
      ctx.lineTo(peakX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Peak Highlight Dot
      ctx.fillStyle = '#C62828';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Peak Callout Pill on graph
      let modeText = 'Peak';
      if (calculatedPeak <= 5.0) modeText = 'Body Heave Peak';
      else if (calculatedPeak <= 20.0) modeText = 'Wheel-Hop Peak';
      else modeText = 'Impact Peak';

      const peakLabel = `${modeText}: ${calculatedPeak.toFixed(1)} Hz`;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const pWidth = ctx.measureText(peakLabel).width + 12;
      const pillX = Math.min(width - pWidth - 8, Math.max(8, peakX + 6));
      const pillY = Math.max(22, peakY - 12);

      ctx.fillStyle = '#FFEBEE';
      ctx.strokeStyle = '#EF5350';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pWidth, 18, 3);
      else ctx.rect(pillX, pillY, pWidth, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#C62828';
      ctx.fillText(peakLabel, pillX + 6, pillY + 12.5);
    }

    // 5. High-Frequency Impulse Tail Callout (If Pothole / Broadband)
    if (showPotholeLabels && highBandRatio > 0.08) {
      const tailX = x20Hz + 20;
      const tailLabel = `Impulse Tail (${(highBandRatio * 100).toFixed(0)}% Energy)`;
      ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const tWidth = ctx.measureText(tailLabel).width + 10;
      
      ctx.fillStyle = 'rgba(254, 242, 242, 0.9)';
      ctx.strokeStyle = '#FCA5A5';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tailX, height - 38, tWidth, 17, 3);
      else ctx.rect(tailX, height - 38, tWidth, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#B91C1C';
      ctx.fillText(tailLabel, tailX + 5, height - 26);
    }

    // 6. Dynamic On-Graph Verdict Stamp (Top-Right overlay)
    if (showPotholeLabels) {
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const stampText = diagType === 'pothole'
        ? `[POTHOLE SPECTRUM: Wheel-Hop (${calculatedPeak.toFixed(1)} Hz) + Broadband Shock]`
        : diagType === 'speed_bump'
        ? `[SPEED BUMP SPECTRUM: Low-Frequency Bounce (${calculatedPeak.toFixed(1)} Hz)]`
        : `[ROAD SPECTRUM: Centroid ${centroid.toFixed(1)} Hz]`;

      const stampW = ctx.measureText(stampText).width + 12;
      ctx.fillStyle = diagType === 'pothole' ? 'rgba(254, 242, 242, 0.94)' : 'rgba(240, 253, 244, 0.94)';
      ctx.strokeStyle = diagType === 'pothole' ? '#FCA5A5' : '#86EFAC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(width - stampW - 8, 8, stampW, 19, 3);
      else ctx.rect(width - stampW - 8, 8, stampW, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = diagType === 'pothole' ? '#B91C1C' : '#15803D';
      ctx.fillText(stampText, width - stampW - 2, 21);
    }

    // Grid labels
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8492A6';
    ctx.fillText('0 Hz', 6, height - 6);
    ctx.fillText('5 Hz', x5Hz - 10, height - 6);
    ctx.fillText('20 Hz', x20Hz - 12, height - 6);
    ctx.fillText(`${nyquistFreq.toFixed(0)} Hz (Nyquist)`, width - 95, height - 6);
  }, [freqs, magnitude, dominantFreq, nyquistFreq, height, showPotholeLabels]);

  return (
    <div className="rounded-lg border border-[#E2E6EC] bg-white overflow-hidden shadow-xs">
      {/* Top Header */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-[#E2E6EC] bg-[#FAFAFC]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5579A8]" />
          <span className="text-xs font-semibold text-[#253247]">{title}</span>
        </div>
        {dominantFreq !== undefined && (
          <div className="text-xs text-[#5A6B82]">
            Dominant Frequency:{' '}
            <span className="text-[#C62828] font-semibold">{dominantFreq.toFixed(2)} Hz</span>
          </div>
        )}
      </div>

      {/* The Canvas */}
      <canvas ref={canvasRef} className="w-full block" />

      {/* Dynamic Spectral Pothole Prediction & Diagnostic Ribbon */}
      <div className={`px-4 py-2.5 border-t text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        spectralDiag.type === 'pothole'
          ? 'bg-[#FEF2F2] border-[#FCA5A5]/60'
          : spectralDiag.type === 'speed_bump'
          ? 'bg-[#FFFBEB] border-[#FDE68A]/60'
          : 'bg-[#F8FAFC] border-[#E2E6EC]'
      }`}>
        <div className="flex items-center gap-2">
          {spectralDiag.type === 'pothole' ? (
            <AlertTriangle className="w-4 h-4 text-[#C62828] shrink-0" />
          ) : spectralDiag.type === 'speed_bump' ? (
            <Zap className="w-4 h-4 text-[#B78103] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
          )}
          <span className={`font-bold tracking-tight text-[11px] uppercase ${
            spectralDiag.type === 'pothole'
              ? 'text-[#C62828]'
              : spectralDiag.type === 'speed_bump'
              ? 'text-[#B78103]'
              : 'text-[#2E7D32]'
          }`}>
            {spectralDiag.label}
          </span>
          <span className="hidden md:inline text-[#8492A6]">|</span>
          <span className="text-[11px] text-[#5A6B82]">{spectralDiag.sublabel}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono shrink-0 text-[#5A6B82]">
          <span>Peak: <strong className="text-[#C62828]">{spectralDiag.peakFreq.toFixed(1)} Hz</strong></span>
          <span>Centroid: <strong className="text-[#253247]">{spectralDiag.centroid.toFixed(1)} Hz</strong></span>
          <span>High-Band (20-50Hz): <strong className="text-[#5579A8]">{(spectralDiag.highBandRatio * 100).toFixed(0)}%</strong></span>
        </div>
      </div>
    </div>
  );
};
