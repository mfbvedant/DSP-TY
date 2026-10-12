import React, { useRef, useEffect } from 'react';

interface FFTCanvasProps {
  freqs: number[];
  magnitude: number[];
  dominantFreq?: number;
  nyquistFreq?: number;
  title?: string;
  height?: number;
}

export const FFTCanvas: React.FC<FFTCanvasProps> = ({
  freqs,
  magnitude,
  dominantFreq,
  nyquistFreq = 50.0,
  title = 'SPECTRAL POWER DENSITY | FFT',
  height = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || magnitude.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#080D18';
    ctx.fillRect(0, 0, width, height);

    // Cybernetic Grid
    ctx.strokeStyle = '#1E2E48';
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

    const maxMag = Math.max(0.01, ...magnitude) * 1.15;
    const n = freqs.length;

    // Gradient fill under spectrum
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.35)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0.0)');

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

    // Spectrum Trace line
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (freqs[i] / nyquistFreq) * width;
      const y = height * (1 - magnitude[i] / maxMag);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dominant Frequency Peak Line
    if (dominantFreq !== undefined && dominantFreq > 0) {
      const peakX = (dominantFreq / nyquistFreq) * width;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#FF5364';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(peakX, 0);
      ctx.lineTo(peakX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#FF5364';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText(`Peak: ${dominantFreq.toFixed(1)} Hz`, Math.min(width - 100, peakX + 6), 24);
    }

    // Grid labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#BBC9CF';
    ctx.fillText('0 Hz', 6, height - 6);
    ctx.fillText(`${(nyquistFreq / 2).toFixed(0)} Hz`, width / 2 - 15, height - 6);
    ctx.fillText(`${nyquistFreq.toFixed(0)} Hz (Nyquist)`, width - 110, height - 6);
  }, [freqs, magnitude, dominantFreq, nyquistFreq, height]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-[#1E2E48] bg-[#080D18]">
      <div className="flex justify-between items-center px-4 py-2 border-b border-[#1E2E48] bg-[#101827]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
          <span className="font-mono text-xs font-semibold text-[#DEE2F2] tracking-wider">{title}</span>
        </div>
        {dominantFreq !== undefined && (
          <div className="font-mono text-xs text-[#95A4BA]">
            Resonant Mode: <span className="text-[#FF5364] font-bold">{dominantFreq.toFixed(2)} Hz</span>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
};
