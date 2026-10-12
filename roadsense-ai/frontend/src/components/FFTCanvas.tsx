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
  title = 'Spectral Magnitude Spectrum (FFT)',
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

    // Light Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

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

    const maxMag = Math.max(0.01, ...magnitude) * 1.15;
    const n = freqs.length;

    // Subtle area fill under spectrum curve
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(85, 121, 168, 0.12)');
    grad.addColorStop(1, 'rgba(85, 121, 168, 0.01)');

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

    // Spectrum Trace line (Restrained Blue, No glow)
    ctx.strokeStyle = '#5579A8';
    ctx.lineWidth = 1.75;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (freqs[i] / nyquistFreq) * width;
      const y = height * (1 - magnitude[i] / maxMag);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Dominant Frequency Peak Indicator
    if (dominantFreq !== undefined && dominantFreq > 0) {
      const peakX = (dominantFreq / nyquistFreq) * width;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#C62828';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(peakX, 0);
      ctx.lineTo(peakX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Peak Label
      ctx.fillStyle = '#C62828';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`Peak: ${dominantFreq.toFixed(1)} Hz`, Math.min(width - 95, peakX + 6), 20);
    }

    // Grid labels
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8492A6';
    ctx.fillText('0 Hz', 6, height - 6);
    ctx.fillText(`${(nyquistFreq / 2).toFixed(0)} Hz`, width / 2 - 15, height - 6);
    ctx.fillText(`${nyquistFreq.toFixed(0)} Hz (Nyquist)`, width - 95, height - 6);
  }, [freqs, magnitude, dominantFreq, nyquistFreq, height]);

  return (
    <div className="rounded-lg border border-[#E2E6EC] bg-white overflow-hidden shadow-xs">
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
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  );
};
