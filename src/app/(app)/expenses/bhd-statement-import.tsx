"use client";

import { useState } from "react";

import { t, type Locale } from "@/lib/i18n";

type Option = {
  id: string;
  name: string;
};

type StatementImportProps = {
  categories: Option[];
  purposes: Option[];
  locale: Locale;
};

type ImportResult = {
  insertedExpenses: number;
  insertedIncomes: number;
  skipped: number;
  errors?: { row: number; message: string }[];
};

export default function BhdStatementImport({
  categories,
  purposes,
  locale,
}: StatementImportProps) {
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultPurposeId, setDefaultPurposeId] = useState("");

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("locale", locale);
      formData.append("defaultCategoryId", defaultCategoryId);
      formData.append("defaultPurposeId", defaultPurposeId);

      const response = await fetch("/api/statements/bhd/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ImportResult & { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? t(locale, "imports.uploadFailed"));
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "imports.uploadFailed"));
    } finally {
      setStatus("idle");
    }
  }

  const canUpload = Boolean(defaultCategoryId && defaultPurposeId);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold">{t(locale, "statementImport.title")}</h2>
        <p className="text-xs text-slate-500">{t(locale, "statementImport.subtitle")}</p>
      </div>

      <div className="grid gap-3 text-xs text-slate-400 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          {t(locale, "statementImport.defaultCategory")}
          <select
            value={defaultCategoryId}
            onChange={(event) => setDefaultCategoryId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          {t(locale, "statementImport.defaultPurpose")}
          <select
            value={defaultPurposeId}
            onChange={(event) => setDefaultPurposeId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          >
            <option value=""></option>
            {purposes.map((purpose) => (
              <option key={purpose.id} value={purpose.id}>
                {purpose.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
          {status === "uploading"
            ? t(locale, "statementImport.uploading")
            : t(locale, "statementImport.selectFile")}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            disabled={!canUpload || status === "uploading"}
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
          {t(locale, "statementImport.supportedNote")}
        </span>
      </div>

      {!canUpload ? (
        <p className="text-xs text-amber-300">{t(locale, "statementImport.selectDefaults")}</p>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {result ? (
        <div className="space-y-2 text-xs text-slate-300">
          <p>
            {t(locale, "statementImport.result")} {result.insertedExpenses} {t(locale, "statementImport.expenses")}
            {" · "}
            {result.insertedIncomes} {t(locale, "statementImport.incomes")}
            {" · "}
            {result.skipped} {t(locale, "imports.skipped")}
          </p>
          {result.errors?.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="mb-2 text-xs text-amber-300">{t(locale, "imports.errors")}</p>
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
