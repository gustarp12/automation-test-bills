"use client";

import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";

type TrendPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

type OverlayTrendProps = {
  months: TrendPoint[];
  locale: Locale;
};

export default function OverlayTrend({ months, locale }: OverlayTrendProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartHeight = 120;
  const barMinHeight = 6;

  const maxValue = useMemo(() => {
    return Math.max(
      1,
      ...months.map((month) => Math.max(month.income, month.expense))
    );
  }, [months]);

  const maxNetMagnitude = useMemo(() => {
    return Math.max(1, ...months.map((month) => Math.abs(month.net)));
  }, [months]);

  const netPoints = useMemo(() => {
    if (months.length <= 1) return "";
    const step = 100 / (months.length - 1);
    return months
      .map((month, index) => {
        const normalized = (month.net + maxNetMagnitude) / (maxNetMagnitude * 2);
        const y = chartHeight - normalized * chartHeight;
        const x = index * step;
        return `${x},${y}`;
      })
      .join(" ");
  }, [months, maxNetMagnitude, chartHeight]);

  const activeMonth = activeIndex !== null ? months[activeIndex] : null;
  const activeLeft =
    activeIndex !== null && months.length > 1
      ? `${(activeIndex / (months.length - 1)) * 100}%`
      : "50%";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">{t(locale, "dashboard.overlayTrendTitle")}</p>
          <p className="text-xs text-slate-500">{t(locale, "dashboard.hoverHint")}</p>
        </div>
        <span className="text-xs text-slate-500">{t(locale, "dashboard.trendSubtitle")}</span>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex flex-col justify-between text-[0.65rem] text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-8">{formatCurrency(maxValue, "DOP", locale)}</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8">{formatCurrency(maxValue / 2, "DOP", locale)}</span>
            <span className="h-px flex-1 bg-slate-900/60" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8">0</span>
            <span className="h-px flex-1 bg-slate-900/40" />
          </div>
        </div>

        <div className="relative grid grid-cols-6 gap-3 pt-4" style={{ height: chartHeight + 32 }}>
          {months.map((month, index) => {
            const incomeHeight = Math.max(barMinHeight, Math.round((month.income / maxValue) * 100));
            const expenseHeight = Math.max(barMinHeight, Math.round((month.expense / maxValue) * 100));
            const isActive = activeIndex === index;

            return (
              <button
                key={month.key}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onBlur={() => setActiveIndex(null)}
                className="group relative flex flex-col items-center gap-2 text-left"
              >
                <div className="flex w-full items-end gap-1" style={{ height: chartHeight }}>
                  <div className="flex flex-1 items-end">
                    <div
                      className={`w-full rounded-full transition ${isActive ? "bg-emerald-300" : "bg-emerald-400/80"}`}
                      style={{ height: `${incomeHeight}%` }}
                    />
                  </div>
                  <div className="flex flex-1 items-end">
                    <div
                      className={`w-full rounded-full transition ${isActive ? "bg-sky-300" : "bg-sky-400/70"}`}
                      style={{ height: `${expenseHeight}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-400">{month.label}</span>
              </button>
            );
          })}

          <svg
            className="pointer-events-none absolute inset-x-0 top-4"
            style={{ height: chartHeight }}
            viewBox={`0 0 100 ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <line x1="0" y1={chartHeight / 2} x2="100" y2={chartHeight / 2} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
            <polyline
              points={netPoints}
              fill="none"
              stroke="rgba(251,191,36,0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {activeMonth ? (
          <div
            className="absolute top-2 z-10 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-lg"
            style={{ left: activeLeft, transform: "translate(-50%, -10%)" }}
          >
            <p className="font-semibold">{activeMonth.label}</p>
            <p className="text-slate-400">
              {t(locale, "dashboard.incomeTrend")}: {formatCurrency(activeMonth.income, "DOP", locale)}
            </p>
            <p className="text-slate-400">
              {t(locale, "dashboard.expenseTrend")}: {formatCurrency(activeMonth.expense, "DOP", locale)}
            </p>
            <p className="text-slate-400">
              {t(locale, "dashboard.netTrend")}: {formatCurrency(activeMonth.net, "DOP", locale)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
          {t(locale, "dashboard.incomeTrend")}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sky-400/70" />
          {t(locale, "dashboard.expenseTrend")}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-300/90" />
          {t(locale, "dashboard.netTrend")}
        </span>
      </div>
    </div>
  );
}
