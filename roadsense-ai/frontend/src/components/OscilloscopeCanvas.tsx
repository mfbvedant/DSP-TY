import React, { useRef, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sliders, Zap } from 'lucide-react';

interface OscilloscopeCanvasProps {
  timeData: number[];
  accelData: number[];
  title?: string;
  yMin?: number;
  yMax?: number;
  lineColor?: string;
  warningLimit?: number;
  height?: number;
  showPotholeLabels?: boolean;
}

export const OscilloscopeCanvas: React.FC<OscilloscopeCanvasProps> = ({
  timeData,
  accelData,
  title = 'Vertical Acceleration (Z-Axis)',
  yMin = -3.5,
  yMax = 3.5,
  lineColor = '#5579A8',
  warningLimit = 1.8,
  height = 240,
  showPotholeLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; val: number; time: number } | null>(null);

  // Dynamic Pothole / Hazard Diagnostics
  const [diagnosis, setDiagnosis] = useState<{
    label: string;
    sublabel: string;
    type: 'pothole' | 'speed_bump' | 'smooth' | 'shock';
    minVal: number;
    maxVal: number;
    p2p: number;
    crestFactor: number;
    isBiphasic: boolean;
  }>({
    label: 'Analyzing Waveform...',
    sublabel: '',
    type: 'smooth',
    minVal: 0,
    maxVal: 0,
    p2p: 0,
    crestFactor: 0,
    isBiphasic: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || accelData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Calculate Waveform Metrics & Shock Detection
    let minVal = Infinity;
    let minIdx = 0;
    let maxVal = -Infinity;
    let maxIdx = 0;
    let sum = 0;
    let sumSq = 0;
    const n = accelData.length;

    for (let i = 0; i < n; i++) {
      const v = accelData[i];
      sum += v;
      sumSq += v * v;
      if (v < minVal) {
        minVal = v;
        minIdx = i;
      }
      if (v > maxVal) {
        maxVal = v;
        maxIdx = i;
      }
    }

    const mean = sum / n;
    const variance = Math.max(0, sumSq / n - mean * mean);
    const rms = Math.sqrt(sumSq / n);
    const p2p = maxVal - minVal;
    const peakAbs = Math.max(Math.abs(minVal), Math.abs(maxVal));
    const crestFactor = rms > 0.001 ? peakAbs / rms : 1;

    // Physical Pothole Criteria:
    // Void dip (negative drop) followed by positive rim strike impact
    const isBiphasic = minIdx < maxIdx && minVal < -0.25 && maxVal > 0.35 && (maxIdx - minIdx) < n * 0.45;
    const isSignificantShock = p2p >= 0.8 && crestFactor >= 2.0;

    let diagType: 'pothole' | 'speed_bump' | 'smooth' | 'shock' = 'smooth';
    let diagLabel = 'SMOOTH ROAD BASELINE';
    let diagSublabel = 'Low-amplitude pavement texture vibration (RMS: ' + rms.toFixed(2) + 'g).';

    if (isBiphasic && isSignificantShock) {
      diagType = 'pothole';
      diagLabel = 'POTHOLE SHOCK SIGNATURE DETECTED';
      diagSublabel = `Biphasic shock: Void drop (${minVal.toFixed(2)}g) followed by violent rim strike (+${maxVal.toFixed(2)}g). Peak-to-peak: ${p2p.toFixed(2)}g, Crest Factor: ${crestFactor.toFixed(1)}.`;
    } else if (maxVal > 0.6 && minVal > -0.4 && maxIdx < minIdx) {
      diagType = 'speed_bump';
      diagLabel = 'SPEED BUMP PROFILE';
      diagSublabel = `Upward chassis compression (+${maxVal.toFixed(2)}g) with low void de-weighting. Crest Factor: ${crestFactor.toFixed(1)}.`;
    } else if (p2p >= 1.0) {
      diagType = 'shock';
      diagLabel = 'TRANSIENT ROAD ANOMALY';
      diagSublabel = `Elevated vibration energy (ΔV: ${p2p.toFixed(2)}g, Crest Factor: ${crestFactor.toFixed(1)}).`;
    }

    setDiagnosis({
      label: diagLabel,
      sublabel: diagSublabel,
      type: diagType,
      minVal,
      maxVal,
      p2p,
      crestFactor,
      isBiphasic,
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

    // Subtle Gridlines
    ctx.strokeStyle = '#EEF2F6';
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

    // Zero-crossing baseline (0g)
    const zeroY = height * (1 - (0 - yMin) / (yMax - yMin));
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();

    // 3. Highlight Shock / Pothole Zone
    if (showPotholeLabels && isSignificantShock) {
      const xStart = Math.max(0, (Math.min(minIdx, maxIdx) / (n - 1)) * width - 12);
      const xEnd = Math.min(width, (Math.max(minIdx, maxIdx) / (n - 1)) * width + 12);
      
      // Translucent event window band
      ctx.fillStyle = diagType === 'pothole' ? 'rgba(239, 68, 68, 0.07)' : 'rgba(245, 158, 11, 0.07)';
      ctx.fillRect(xStart, 0, xEnd - xStart, height);

      // Event boundary lines
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = diagType === 'pothole' ? '#FFCDD2' : '#FFE082';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStart, 0);
      ctx.lineTo(xStart, height);
      ctx.moveTo(xEnd, 0);
      ctx.lineTo(xEnd, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Warning Thresholds
    const warnUpperY = height * (1 - (warningLimit - yMin) / (yMax - yMin));
    const warnLowerY = height * (1 - (-warningLimit - yMin) / (yMax - yMin));

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#B78103';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, warnUpperY);
    ctx.lineTo(width, warnUpperY);
    ctx.stroke();

    ctx.strokeStyle = '#C62828';
    ctx.beginPath();
    ctx.moveTo(0, warnLowerY);
    ctx.lineTo(width, warnLowerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Signal Trace Line
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.85;
    ctx.beginPath();

    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const val = accelData[i];
      const y = height * (1 - (val - yMin) / (yMax - yMin));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Data Sample Dots
    ctx.fillStyle = lineColor;
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 45))) {
      const x = (i / (n - 1)) * width;
      const val = accelData[i];
      const y = height * (1 - (val - yMin) / (yMax - yMin));
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. In-Graph Dynamic Pothole Annotation Callouts
    if (showPotholeLabels && isSignificantShock) {
      const minX = (minIdx / (n - 1)) * width;
      const minY = height * (1 - (minVal - yMin) / (yMax - yMin));
      const maxX = (maxIdx / (n - 1)) * width;
      const maxY = height * (1 - (maxVal - yMin) / (yMax - yMin));

      // Draw helper for rounded callout box
      const drawCallout = (
        text: string,
        x: number,
        y: number,
        bgColor: string,
        textColor: string,
        borderColor: string,
        pointUp: boolean
      ) => {
        ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const textWidth = ctx.measureText(text).width;
        const boxW = textWidth + 12;
        const boxH = 17;
        const boxX = Math.max(6, Math.min(width - boxW - 6, x - boxW / 2));
        const boxY = pointUp ? y - boxH - 7 : y + 7;

        // Leader line
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, pointUp ? y - 6 : y + 6);
        ctx.stroke();

        // Box
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 3);
        else ctx.rect(boxX, boxY, boxW, boxH);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = textColor;
        ctx.fillText(text, boxX + 6, boxY + 12);

        // Focal marker dot
        ctx.fillStyle = borderColor;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      };

      // Phase 1: Void Drop Callout (Negative Dip)
      if (minVal <= -0.25) {
        drawCallout(
          `Phase 1: Void Drop (${minVal.toFixed(2)}g)`,
          minX,
          minY,
          '#FFEBEE',
          '#C62828',
          '#E53935',
          false
        );
      }

      // Phase 2: Rim Strike Callout (Positive Spike)
      if (maxVal >= 0.35) {
        drawCallout(
          `Phase 2: Rim Strike (+${maxVal.toFixed(2)}g)`,
          maxX,
          maxY,
          '#FFF8E1',
          '#B78103',
          '#F59E0B',
          true
        );
      }

      // Dynamic On-Graph Verdict Stamp (Top-Left overlay)
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const stampText = diagType === 'pothole'
        ? `[POTHOLE DETECTED: Void-to-Impact ΔV = ${p2p.toFixed(2)}g | Crest: ${crestFactor.toFixed(1)}]`
        : `[HAZARD EVENT: ΔV = ${p2p.toFixed(2)}g | Crest: ${crestFactor.toFixed(1)}]`;
      
      const stampW = ctx.measureText(stampText).width + 12;
      ctx.fillStyle = diagType === 'pothole' ? 'rgba(254, 242, 242, 0.92)' : 'rgba(254, 243, 199, 0.92)';
      ctx.strokeStyle = diagType === 'pothole' ? '#FCA5A5' : '#FDE68A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(width - stampW - 8, 8, stampW, 19, 3);
      else ctx.rect(width - stampW - 8, 8, stampW, 19);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = diagType === 'pothole' ? '#B91C1C' : '#B45309';
      ctx.fillText(stampText, width - stampW - 2, 21);
    }

    // Grid labels
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#8492A6';
    ctx.fillText(`${yMax.toFixed(1)}g`, 6, 14);
    ctx.fillText(`0.0g`, 6, zeroY - 4);
    ctx.fillText(`${yMin.toFixed(1)}g`, 6, height - 6);

    ctx.fillStyle = '#B78103';
    ctx.fillText(`+${warningLimit.toFixed(1)}g threshold`, width - 90, warnUpperY - 4);
    ctx.fillStyle = '#C62828';
    ctx.fillText(`-${warningLimit.toFixed(1)}g threshold`, width - 90, warnLowerY - 4);
  }, [timeData, accelData, yMin, yMax, lineColor, warningLimit, height, showPotholeLabels]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || accelData.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;

    const idx = Math.min(
      accelData.length - 1,
      Math.max(0, Math.round((mouseX / width) * (accelData.length - 1)))
    );
    const val = accelData[idx];
    const time = timeData[idx] || 0;
    const y = height * (1 - (val - yMin) / (yMax - yMin));

    setHoverInfo({ x: mouseX, y, val, time });
  };

  return (
    <div className="rounded-lg border border-[#E2E6EC] bg-white overflow-hidden shadow-xs">
      {/* Canvas Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-[#E2E6EC] bg-[#FAFAFC]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5579A8]" />
          <span className="text-xs font-semibold text-[#253247]">{title}</span>
        </div>
        <div className="text-xs text-[#5A6B82] font-mono">
          {hoverInfo ? (
            <span>
              T: <span className="text-[#253247] font-semibold">{hoverInfo.time.toFixed(3)}s</span> | Accel:{' '}
              <span className="text-[#5579A8] font-semibold">{hoverInfo.val.toFixed(3)}g</span>
            </span>
          ) : (
            <span className="text-[#8492A6]">Hover waveform to inspect</span>
          )}
        </div>
      </div>

      {/* The Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="w-full cursor-crosshair block"
      />

      {/* Dynamic Pothole Prediction & Diagnostic Ribbon */}
      <div className={`px-4 py-2.5 border-t text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        diagnosis.type === 'pothole'
          ? 'bg-[#FEF2F2] border-[#FCA5A5]/60'
          : diagnosis.type === 'speed_bump'
          ? 'bg-[#FFFBEB] border-[#FDE68A]/60'
          : 'bg-[#F8FAFC] border-[#E2E6EC]'
      }`}>
        <div className="flex items-center gap-2">
          {diagnosis.type === 'pothole' ? (
            <AlertTriangle className="w-4 h-4 text-[#C62828] shrink-0" />
          ) : diagnosis.type === 'speed_bump' ? (
            <Zap className="w-4 h-4 text-[#B78103] shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0" />
          )}
          <span className={`font-bold tracking-tight text-[11px] uppercase ${
            diagnosis.type === 'pothole'
              ? 'text-[#C62828]'
              : diagnosis.type === 'speed_bump'
              ? 'text-[#B78103]'
              : 'text-[#2E7D32]'
          }`}>
            {diagnosis.label}
          </span>
          <span className="hidden md:inline text-[#8492A6]">|</span>
          <span className="text-[11px] text-[#5A6B82]">{diagnosis.sublabel}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono shrink-0 text-[#5A6B82]">
          <span>ΔV: <strong className="text-[#253247]">{diagnosis.p2p.toFixed(2)}g</strong></span>
          <span>Crest: <strong className="text-[#253247]">{diagnosis.crestFactor.toFixed(1)}</strong></span>
          <span>Min: <strong className="text-[#C62828]">{diagnosis.minVal.toFixed(2)}g</strong></span>
          <span>Max: <strong className="text-[#2E7D32]">{diagnosis.maxVal.toFixed(2)}g</strong></span>
        </div>
      </div>
    </div>
  );
};
