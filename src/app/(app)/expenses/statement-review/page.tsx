"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { t, type Locale } from "@/lib/i18n";

type ReviewRow = {
  index: number;
  date: string;
  reference: string;
  detail: string;
  debit: number;
  credit: number;
  balance: number;
  amount: number;
  type: "expense" | "income";
};

type ReviewPayload = {
  locale: Locale;
  defaultCategoryId: string;
  defaultPurposeId: string;
  merchantId: string;
  merchantName: string;
  categoryName: string;
  purposeName: string;
  rows: ReviewRow[];
};

export default function StatementReviewPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [overrides, setOverrides] = useState<Record<number, "expense" | "income">>({});
  const [excluded, setExcluded] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ insertedExpenses: number; insertedIncomes: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("statementImportReview");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ReviewPayload;
      setPayload(parsed);
    } catch {
      setPayload(null);
    }
  }, []);

  const locale = payload?.locale ?? "en";
  const rows = payload?.rows ?? [];

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "es" ? "es-DO" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const summary = useMemo(() => {
    let expenseCount = 0;
    let incomeCount = 0;
    let expenseTotal = 0;
    let incomeTotal = 0;

    rows.forEach((row) => {
      if (excluded[row.index]) return;
      const type = overrides[row.index] ?? row.type;
      if (type === "income") {
        incomeCount += 1;
        incomeTotal += row.amount;
      } else {
        expenseCount += 1;
        expenseTotal += row.amount;
      }
    });

    return { expenseCount, incomeCount, expenseTotal, incomeTotal };
  }, [rows, overrides, excluded]);

  function buildDescription(row: ReviewRow) {
    const parts = [row.detail];
    if (row.reference) {
      parts.push(`${t(locale, "statementImport.reference")}: ${row.reference}`);
    }
    return parts.filter(Boolean).join(" · ");
  }

  async function handleImport() {
    if (!payload) return;
    setError(null);
    setResult(null);
    setStatus("uploading");

    try {
      const rowsToSend = rows
        .filter((row) => !excluded[row.index])
        .map((row) => ({
          date: row.date,
          description: buildDescription(row),
          amount: row.amount,
          type: overrides[row.index] ?? row.type,
        }));

      const response = await fetch("/api/statements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          defaultCategoryId: payload.defaultCategoryId,
          defaultPurposeId: payload.defaultPurposeId,
          merchantId: payload.merchantId,
          rows: rowsToSend,
        }),
      });

      const data = (await response.json()) as {
        insertedExpenses: number;
        insertedIncomes: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? t(locale, "imports.uploadFailed"));
      }

      setResult({ insertedExpenses: data.insertedExpenses, insertedIncomes: data.insertedIncomes });
      localStorage.removeItem("statementImportReview");
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "imports.uploadFailed"));
    } finally {
      setStatus("idle");
    }
  }

  if (!payload) {
    return (
      <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 text-sm text-slate-300">
        <h2 className="text-lg font-semibold">{t(locale, "statementImport.reviewTitle")}</h2>
        <p>{t(locale, "statementImport.noRows")}</p>
        <Link
          href="/expenses"
          className="inline-flex items-center rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          {t(locale, "statementImport.backToMapping")}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t(locale, "statementImport.reviewTitle")}</h2>
        <p className="text-xs text-slate-400">{t(locale, "statementImport.reviewSubtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <span className="rounded-full border border-slate-700 px-3 py-1">
          {payload.categoryName || t(locale, "statementImport.defaultCategory")}
        </span>
        <span className="rounded-full border border-slate-700 px-3 py-1">
          {payload.purposeName || t(locale, "statementImport.defaultPurpose")}
        </span>
        {payload.merchantName ? (
          <span className="rounded-full border border-slate-700 px-3 py-1">{payload.merchantName}</span>
        ) : null}
      </div>

      <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <p className="text-slate-400">{t(locale, "statementImport.expenses")}</p>
          <p className="text-lg font-semibold">{summary.expenseCount}</p>
          <p>{formatter.format(summary.expenseTotal)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <p className="text-slate-400">{t(locale, "statementImport.incomes")}</p>
          <p className="text-lg font-semibold">{summary.incomeCount}</p>
          <p>{formatter.format(summary.incomeTotal)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-2 text-[0.65rem] uppercase text-slate-400">
          <span className="col-span-2">{t(locale, "common.date")}</span>
          <span className="col-span-2">{t(locale, "statementImport.reference")}</span>
          <span className="col-span-3">{t(locale, "statementImport.detail")}</span>
          <span className="col-span-1">{t(locale, "statementImport.debit")}</span>
          <span className="col-span-1">{t(locale, "statementImport.credit")}</span>
          <span className="col-span-1">{t(locale, "statementImport.balance")}</span>
          <span className="col-span-1">{t(locale, "statementImport.type")}</span>
          <span className="col-span-1">{t(locale, "statementImport.include")}</span>
        </div>
        {rows.map((row) => (
          <div key={row.index} className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-slate-300">
            <span className="col-span-2">{row.date || "-"}</span>
            <span className="col-span-2 truncate">{row.reference || "-"}</span>
            <span className="col-span-3 truncate">{row.detail || "-"}</span>
            <span className="col-span-1">{row.debit ? formatter.format(row.debit) : "-"}</span>
            <span className="col-span-1">{row.credit ? formatter.format(row.credit) : "-"}</span>
            <span className="col-span-1">{row.balance ? formatter.format(row.balance) : "-"}</span>
            <span className="col-span-1">
              <select
                value={overrides[row.index] ?? row.type}
                onChange={(event) =>
                  setOverrides((prev) => ({
                    ...prev,
                    [row.index]: event.target.value as "expense" | "income",
                  }))
                }
                className="w-full rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1"
              >
                <option value="expense">{t(locale, "statementImport.expenses")}</option>
                <option value="income">{t(locale, "statementImport.incomes")}</option>
              </select>
            </span>
            <span className="col-span-1">
              <input
                type="checkbox"
                checked={!excluded[row.index]}
                onChange={(event) =>
                  setExcluded((prev) => ({ ...prev, [row.index]: !event.target.checked }))
                }
              />
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/expenses")}
          className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          {t(locale, "statementImport.backToMapping")}
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={status === "uploading"}
          className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "uploading" ? t(locale, "statementImport.uploading") : t(locale, "statementImport.importNow")}
        </button>
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {result ? (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {t(locale, "statementImport.result")} {result.insertedExpenses} {t(locale, "statementImport.expenses")}
            {" · "}
            {result.insertedIncomes} {t(locale, "statementImport.incomes")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/expenses"
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "nav.expenses")}
            </Link>
            <Link
              href="/incomes"
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "nav.income")}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "nav.dashboard")}
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
