"use client";

import { useState } from "react";
import Papa from "papaparse";

import { t, type Locale } from "@/lib/i18n";

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
};

type IncomeCsvImportProps = {
  currencies: CurrencyOption[];
  locale: Locale;
};

type ImportResult = {
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export default function IncomeCsvImport({ currencies, locale }: IncomeCsvImportProps) {
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setStatus("parsing");

    const text = await file.text();

    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors?.length) {
      setStatus("idle");
      setError(parsed.errors[0]?.message ?? t(locale, "incomeImports.parseError"));
      return;
    }

    setStatus("uploading");
    try {
      const response = await fetch("/api/incomes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          rows: parsed.data ?? [],
        }),
      });

      const data = (await response.json()) as ImportResult & { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? t(locale, "incomeImports.uploadFailed"));
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "incomeImports.uploadFailed"));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold">{t(locale, "incomeImports.title")}</h2>
        <p className="text-xs text-slate-500">{t(locale, "incomeImports.subtitle")}</p>
      </div>

      <div className="space-y-2 text-xs text-slate-400">
        <p>{t(locale, "incomeImports.instructions")}</p>
        <p className="text-slate-500">
          {t(locale, "incomeImports.headers")}{" "}
          <span className="text-slate-300">date, amount, currency</span>{" "}
          {t(locale, "incomeImports.headersOptional")}{" "}
          <span className="text-slate-300">source, notes, fx_rate_to_dop</span>
        </p>
        <p className="text-slate-500">
          {t(locale, "incomeImports.hint")}{" "}
          <span className="text-slate-300">
            {t(locale, "incomeImports.sample")}
          </span>
        </p>
        <p className="text-slate-500">
          {t(locale, "incomeImports.available")}
          <span className="text-slate-300">
            {currencies.length} {t(locale, "common.currency")}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href="/templates/incomes_template.csv"
          className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          {t(locale, "common.downloadTemplate")}
        </a>
        <label className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
          {status === "uploading"
            ? t(locale, "incomeImports.uploading")
            : t(locale, "incomeImports.selectFile")}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
              event.currentTarget.value = "";
            }}
          />
        </label>
        <span className="text-xs text-slate-500">
          {status === "parsing"
            ? t(locale, "incomeImports.parsing")
            : status === "uploading"
              ? t(locale, "incomeImports.uploading")
              : t(locale, "incomeImports.ready")}
        </span>
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {result ? (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {t(locale, "incomeImports.result")}{" "}
            <span className="text-emerald-300">
              {result.inserted} {t(locale, "incomeImports.inserted")}
            </span>{" "}
            · {result.skipped} {t(locale, "incomeImports.skipped")}
          </p>
          {result.errors?.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="mb-2 text-xs text-amber-300">
                {t(locale, "incomeImports.errors")}
              </p>
              <ul className="space-y-1 text-xs text-slate-400">
                {result.errors.map((item) => (
                  <li key={`${item.row}-${item.message}`}>
                    #{item.row}: {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
