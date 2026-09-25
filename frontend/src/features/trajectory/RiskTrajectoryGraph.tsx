import React, { useState } from 'react';
import { TrajectoryReplayItem, TrajectoryState } from '@sentinel/shared';

interface RiskTrajectoryGraphProps {
  actions: TrajectoryReplayItem[];
  className?: string;
}

export const RiskTrajectoryGraph: React.FC<RiskTrajectoryGraphProps> = ({
  actions,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!actions || actions.length === 0) {
    return (
      <div className={`p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface-primary dark:bg-surface-primary ${className}`}>
        <p className="text-xs text-slate-400">No action history recorded for this session yet.</p>
      </div>
    );
  }

  // SVG coordinate dimensions
  const width = 700;
  const height = 260;
  const paddingLeft = 45;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (actions.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (actions.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    return paddingTop + chartHeight - (clamped / 100) * chartHeight;
  };

  // Build points for risk line and deviation line
  const riskPoints = actions.map((a, i) => `${getX(i)},${getY(a.risk)}`).join(' ');
  const devPoints = actions.map((a, i) => `${getX(i)},${getY(a.trajectoryDeviation)}`).join(' ');

  // Area under risk curve
  const firstX = getX(0);
  const lastX = getX(actions.length - 1);
  const bottomY = getY(0);
  const riskAreaPath = `M ${firstX},${bottomY} L ${actions.map((a, i) => `${getX(i)},${getY(a.risk)}`).join(' L ')} L ${lastX},${bottomY} Z`;

  const getStateColor = (state: TrajectoryState) => {
    switch (state) {
      case 'NORMAL':
        return '#10b981'; // emerald
      case 'WATCH':
        return '#f59e0b'; // amber
      case 'DRIFTING':
        return '#f97316'; // orange
      case 'ESCALATING':
        return '#ef4444'; // rose
      case 'CRITICAL':
        return '#dc2626'; // dark red
      default:
        return '#64748b';
    }
  };

  return (
    <div className={`relative bg-surface-primary dark:bg-surface-primary rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-tactile-subtle ${className}`}>
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-bold tracking-tight uppercase text-slate-400">
            Sequential Risk & Trajectory Timeline
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Chronological behavioral drift across {actions.length} action{actions.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
            <span>Cumulative Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-sky-400 inline-block" />
            <span>Trajectory Deviation</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px] select-none"
        >
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Threshold Bands */}
          {/* 70 - 100: Escalating / Critical */}
          <rect
            x={paddingLeft}
            y={getY(100)}
            width={chartWidth}
            height={getY(70) - getY(100)}
            className="fill-rose-500/5 dark:fill-rose-500/10"
          />
          {/* 50 - 70: Drifting */}
          <rect
            x={paddingLeft}
            y={getY(70)}
            width={chartWidth}
            height={getY(50) - getY(70)}
            className="fill-orange-500/5 dark:fill-orange-500/10"
          />
          {/* 30 - 50: Watch */}
          <rect
            x={paddingLeft}
            y={getY(50)}
            width={chartWidth}
            height={getY(30) - getY(50)}
            className="fill-amber-500/5 dark:fill-amber-500/10"
          />
          {/* 0 - 30: Normal */}
          <rect
            x={paddingLeft}
            y={getY(30)}
            width={chartWidth}
            height={getY(0) - getY(30)}
            className="fill-emerald-500/5 dark:fill-emerald-500/5"
          />

          {/* Horizontal Grid lines */}
          {[0, 30, 50, 70, 100].map((val) => (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={getY(val)}
                x2={paddingLeft + chartWidth}
                y2={getY(val)}
                className="stroke-slate-200/80 dark:stroke-slate-800"
                strokeDasharray={val === 0 ? undefined : '3 3'}
                strokeWidth={val === 0 ? '1.5' : '1'}
              />
              <text
                x={paddingLeft - 8}
                y={getY(val) + 3.5}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}
              </text>
            </g>
          ))}

          {/* State Threshold Labels on right */}
          <text x={paddingLeft + chartWidth + 5} y={getY(15)} className="text-[9px] fill-emerald-600 dark:fill-emerald-400 font-semibold">
            NORMAL
          </text>
          <text x={paddingLeft + chartWidth + 5} y={getY(40)} className="text-[9px] fill-amber-600 dark:fill-amber-400 font-semibold">
            WATCH
          </text>
          <text x={paddingLeft + chartWidth + 5} y={getY(60)} className="text-[9px] fill-orange-600 dark:fill-orange-400 font-semibold">
            DRIFT
          </text>
          <text x={paddingLeft + chartWidth + 5} y={getY(85)} className="text-[9px] fill-rose-600 dark:fill-rose-400 font-semibold">
            CRIT
          </text>

          {/* Risk Gradient Area */}
          <path d={riskAreaPath} fill="url(#riskGradient)" />

          {/* Trajectory Deviation Line (dashed sky) */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="4 4"
            points={devPoints}
            className="opacity-80"
          />

          {/* Cumulative Risk Line (solid emerald/amber/rose gradient) */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={riskPoints}
          />

          {/* Data Points */}
          {actions.map((act, i) => {
            const cx = getX(i);
            const cy = getY(act.risk);
            const pointColor = getStateColor(act.state);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={act.eventId || i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Outer halo on hover */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill={pointColor}
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}
                {/* Main point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? '6' : '4.5'}
                  fill={pointColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all"
                />

                {/* X-axis action number label */}
                <text
                  x={cx}
                  y={height - 15}
                  textAnchor="middle"
                  className={`text-[10px] font-mono ${
                    isHovered
                      ? 'fill-slate-900 dark:fill-slate-100 font-bold'
                      : 'fill-slate-400'
                  }`}
                >
                  #{i + 1}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && actions[hoveredIdx] && (
          <div
            className="absolute z-20 pointer-events-none p-3 bg-slate-900/95 dark:bg-slate-900/95 text-white rounded-xl shadow-tactile-prominent border border-slate-700/60 backdrop-blur-md text-xs space-y-1 min-w-[200px]"
            style={{
              left: `${Math.min(75, Math.max(10, (hoveredIdx / (actions.length - 1 || 1)) * 80))}%`,
              top: '15px'
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-1.5">
              <span className="font-semibold text-emerald-400">
                Action #{hoveredIdx + 1} — {actions[hoveredIdx].action}
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300">
                {actions[hoveredIdx].state}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 truncate">
              <strong>Resource:</strong> {actions[hoveredIdx].resource}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span>Risk: <strong>{actions[hoveredIdx].risk}/100</strong></span>
              <span>Dev: <strong>{actions[hoveredIdx].trajectoryDeviation}/100</strong></span>
              <span className="text-emerald-300">[{actions[hoveredIdx].decision}]</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
