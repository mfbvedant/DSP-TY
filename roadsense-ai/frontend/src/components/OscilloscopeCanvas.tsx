import React, { useRef, useEffect, useState } from 'react';

interface OscilloscopeCanvasProps {
  timeData: number[];
  accelData: number[];
  title?: string;
  yMin?: number;
  yMax?: number;
  lineColor?: string;
  warningLimit?: number;
  height?: number;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  timeData,
  accelData,
  title = 'CHASSIS ACCELERATION (Z-AXIS)',
  yMin = -3.5,
  yMax = 3.5,
  lineColor = '#00D4FF',
  warningLimit = 1.8,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; val: number; time: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || accelData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina support
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
    const numYDivs = 8;
    for (let i = 0; i <= numYDivs; i++) {
      const y = (height / numYDivs) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const numXDivs = 10;
    for (let i = 0; i <= numXDivs; i++) {
      const x = (width / numXDivs) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Zero-crossing baseline
    const zeroY = height * (1 - (0 - yMin) / (yMax - yMin));
    ctx.strokeStyle = '#3C494E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // Warning Thresholds
    const warnUpperY = height * (1 - (warningLimit - yMin) / (yMax - yMin));
    const warnLowerY = height * (1 - (-warningLimit - yMin) / (yMax - yMin));

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#FFB547';
    ctx.beginPath();
    ctx.moveTo(0, warnUpperY);
    ctx.lineTo(width, warnUpperY);
    ctx.stroke();

    ctx.strokeStyle = '#FF5364';
    ctx.beginPath();
    ctx.moveTo(0, warnLowerY);
    ctx.lineTo(width, warnLowerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Signal Trace
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();

    const n = accelData.length;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const val = accelData[i];
      const y = height * (1 - (val - yMin) / (yMax - yMin));

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // Data points
    ctx.fillStyle = lineColor;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 40))) {
      const x = (i / (n - 1)) * width;
      const val = accelData[i];
      const y = height * (1 - (val - yMin) / (yMax - yMin));
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Grid labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#BBC9CF';
    ctx.fillText(`${yMax.toFixed(1)}g`, 6, 14);
    ctx.fillText(`0.0g`, 6, zeroY - 4);
    ctx.fillText(`${yMin.toFixed(1)}g`, 6, height - 6);

    ctx.fillStyle = '#FFB547';
    ctx.fillText(`+${warningLimit.toFixed(1)}g`, width - 50, warnUpperY - 4);
    ctx.fillStyle = '#FF5364';
    ctx.fillText(`-${warningLimit.toFixed(1)}g`, width - 50, warnLowerY - 4);
  }, [timeData, accelData, yMin, yMax, lineColor, warningLimit, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || accelData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;

    const idx = Math.min(accelData.length - 1, Math.max(0, Math.round((mouseX / width) * (accelData.length - 1))));
    const val = accelData[idx];
    const time = timeData[idx] || 0;
    const y = height * (1 - (val - yMin) / (yMax - yMin));

    setHoverInfo({ x: mouseX, y, val, time });
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-[#1E2E48] bg-[#080D18]">
      <div className="flex justify-between items-center px-4 py-2 border-b border-[#1E2E48] bg-[#101827]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_#00D4FF]" />
          <span className="font-mono text-xs font-semibold text-[#DEE2F2] tracking-wider">{title}</span>
        </div>
        <div className="font-mono text-xs text-[#95A4BA]">
          {hoverInfo ? (
            <span className="text-[#00D4FF]">
              T: {hoverInfo.time.toFixed(3)}s | Accel: <span className="text-white font-bold">{hoverInfo.val.toFixed(3)}g</span>
            </span>
          ) : (
            <span>Hover waveform to inspect</span>
          )}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="w-full cursor-crosshair block"
      />
    </div>
  );
};
