"use client";

import { useMemo, useRef, useState } from "react";

import { formatCurrency } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";

type Segment = {
  name: string;
  total: number;
  color: string;
};

type CategoryDonutProps = {
  segments: Segment[];
  total: number;
  locale: Locale;
};

const DONUT_SIZE = 140;
const DONUT_STROKE = 16;

export default function CategoryDonut({ segments, total, locale }: CategoryDonutProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [tooltip, setTooltip] = useState<{
    name: string;
    total: number;
    percent: number;
    x: number;
    y: number;
  } | null>(null);

  const radius = (DONUT_SIZE - DONUT_STROKE) / 2;
  const center = DONUT_SIZE / 2;
  const circumference = 2 * Math.PI * radius;

  const donutSegments = useMemo(() => {
    if (!total || segments.length === 0) {
      return [];
    }
    let offset = 0;
    return segments.map((segment) => {
      const percent = segment.total / total;
      const length = percent * circumference;
      const dasharray = `${length} ${circumference - length}`;
      const dashoffset = -offset;
      offset += length;
      return { ...segment, percent, dasharray, dashoffset };
    });
  }, [segments, total, circumference]);

  const showEmpty = donutSegments.length === 0;

  const displayTotal = activeSegment ? activeSegment.total : total;
  const displayLabel = activeSegment ? activeSegment.name : t(locale, "dashboard.thisMonth");
  const displayPercent = activeSegment
    ? `${Math.round((activeSegment.total / total) * 100)}%`
    : null;

  return (
    <div className="space-y-3" ref={wrapperRef}>
      {showEmpty ? (
        <p className="text-xs text-slate-500">{t(locale, "dashboard.awaiting")}</p>
      ) : (
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="relative h-36 w-36">
            <svg
              width={DONUT_SIZE}
              height={DONUT_SIZE}
              viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
              className="block"
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#1f2937"
                strokeWidth={DONUT_STROKE}
              />
              <g transform={`rotate(-90 ${center} ${center})`}>
                {donutSegments.map((segment) => (
                  <circle
                    key={`${segment.name}-${segment.total}`}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth={activeSegment?.name === segment.name ? DONUT_STROKE + 2 : DONUT_STROKE}
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
                    className="cursor-pointer transition-opacity"
                    style={{
                      opacity: activeSegment && activeSegment.name !== segment.name ? 0.35 : 1,
                    }}
                    onMouseMove={(event) => {
                      const rect = wrapperRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setActiveSegment(segment);
                      setTooltip({
                        name: segment.name,
                        total: segment.total,
                        percent: segment.percent,
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setTooltip(null);
                      setActiveSegment(null);
                    }}
                  />
                ))}
              </g>
            </svg>
            <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full border border-slate-800 bg-slate-950/90 text-center text-xs text-slate-300">
              <span className="text-[10px] uppercase text-slate-500">
                {displayLabel}
              </span>
              <span className="mt-1 text-sm font-semibold text-slate-100">
                {formatCurrency(displayTotal, "DOP", locale)}
              </span>
              {displayPercent ? (
                <span className="text-[10px] text-slate-400">{displayPercent}</span>
              ) : null}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {donutSegments.map((segment) => {
              const percent = Math.round(segment.percent * 100);
              return (
                <div
                  key={`${segment.name}-${segment.total}`}
                  className="flex items-center justify-between text-xs text-slate-300"
                  onMouseEnter={() => setActiveSegment(segment)}
                  onMouseLeave={() => setActiveSegment(null)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span>{segment.name}</span>
                  </div>
                  <span>
                    {formatCurrency(segment.total, "DOP", locale)} · {percent}%
                  </span>
                </div>
              );
            })}
          </div>
          {tooltip ? (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -120%)",
              }}
            >
              <p className="font-semibold">{tooltip.name}</p>
              <p className="text-slate-400">
                {formatCurrency(tooltip.total, "DOP", locale)}
              </p>
              <p className="text-slate-400">{Math.round(tooltip.percent * 100)}%</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
