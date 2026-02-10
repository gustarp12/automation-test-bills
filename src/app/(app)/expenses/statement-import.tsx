"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { t, type Locale } from "@/lib/i18n";

const MAX_PREVIEW_ROWS = 50;

const LOCAL_STORAGE_PREFIX = "statementMapping";

type Option = {
  id: string;
  name: string;
};

type RawRow = Record<string, unknown>;

type MappedRow = {
  index: number;
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
};

type StatementImportProps = {
  categories: Option[];
  purposes: Option[];
  merchants: Option[];
  locale: Locale;
};

function normalizeHeader(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDate(value: unknown) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  if (!str) return "";
  const parts = str.split("/");
  if (parts.length >= 2) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    if (!day || !month) return "";
    let year = new Date().getFullYear();
    if (parts.length >= 3) {
      const y = Number(parts[2]);
      if (y) year = y < 100 ? 2000 + y : y;
    } else {
      const currentMonth = new Date().getMonth() + 1;
      if (month > currentMonth) year -= 1;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const asDate = new Date(str);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString().slice(0, 10);
  return "";
}

function detectHeaderRow(rows: unknown[][]) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const joined = row
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (joined.includes("fecha") && (joined.includes("debito") || joined.includes("credito") || joined.includes("monto") || joined.includes("amount"))) {
      return i;
    }
  }
  return 0;
}

function rowsFromXlsx(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const rows: RawRow[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
    if (!rawRows.length) return;
    const headerIndex = detectHeaderRow(rawRows);
    const headers = (rawRows[headerIndex] ?? []).map(normalizeHeader);
    for (let i = headerIndex + 1; i < rawRows.length; i += 1) {
      const row = rawRows[i] ?? [];
      const record: RawRow = {};
      headers.forEach((header, idx) => {
        if (!header) return;
        record[header] = row[idx];
      });
      rows.push(record);
    }
  });

  return rows;
}

function rowsFromCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data ?? [];
}

export default function StatementImport({
  categories,
  purposes,
  merchants,
  locale,
}: StatementImportProps) {
  const [status, setStatus] = useState<"idle" | "parsing" | "uploading">("idle");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ insertedExpenses: number; insertedIncomes: number } | null>(null);

  const [merchantId, setMerchantId] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultPurposeId, setDefaultPurposeId] = useState("");

  const [dateKey, setDateKey] = useState("");
  const [descriptionKey, setDescriptionKey] = useState("");
  const [debitKey, setDebitKey] = useState("");
  const [creditKey, setCreditKey] = useState("");
  const [amountKey, setAmountKey] = useState("");
  const [typeKey, setTypeKey] = useState("");

  const [overrides, setOverrides] = useState<Record<number, "expense" | "income">>({});
  const [excluded, setExcluded] = useState<Record<number, boolean>>({});

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(String(key)));
    });
    return Array.from(keys);
  }, [rawRows]);

  useEffect(() => {
    if (!merchantId) return;
    const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:${merchantId}`);
    if (!stored) return;
    try {
      const mapping = JSON.parse(stored) as {
        dateKey?: string;
        descriptionKey?: string;
        debitKey?: string;
        creditKey?: string;
        amountKey?: string;
        typeKey?: string;
      };
      setDateKey(mapping.dateKey ?? "");
      setDescriptionKey(mapping.descriptionKey ?? "");
      setDebitKey(mapping.debitKey ?? "");
      setCreditKey(mapping.creditKey ?? "");
      setAmountKey(mapping.amountKey ?? "");
      setTypeKey(mapping.typeKey ?? "");
    } catch {
      // ignore
    }
  }, [merchantId]);

  const previewRows = useMemo(() => {
    if (!rawRows.length) return [] as MappedRow[];
    return rawRows.slice(0, MAX_PREVIEW_ROWS).map((row, index) => {
      const dateValue = dateKey ? parseDate(row[dateKey]) : "";
      const descriptionValue = descriptionKey ? String(row[descriptionKey] ?? "").trim() : "";
      const debit = debitKey ? parseNumber(row[debitKey]) : 0;
      const credit = creditKey ? parseNumber(row[creditKey]) : 0;
      let amount = 0;
      let type: "expense" | "income" = "expense";

      if (debit || credit) {
        if (debit) {
          amount = debit;
          type = "expense";
        } else {
          amount = credit;
          type = "income";
        }
      } else if (amountKey) {
        amount = Math.abs(parseNumber(row[amountKey]));
        if (typeKey) {
          const typeVal = String(row[typeKey] ?? "").toLowerCase();
          type = typeVal.includes("credit") || typeVal.includes("cr") ? "income" : "expense";
        }
      }

      const overrideType = overrides[index];

      return {
        index,
        date: dateValue,
        description: descriptionValue,
        amount,
        type: overrideType ?? type,
      };
    });
  }, [rawRows, dateKey, descriptionKey, debitKey, creditKey, amountKey, typeKey, overrides]);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setRawRows([]);
    setOverrides({});
    setExcluded({});
    setStatus("parsing");

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const rows = rowsFromCsv(text);
        setRawRows(rows);
      } else {
        const buffer = await file.arrayBuffer();
        const rows = rowsFromXlsx(buffer);
        setRawRows(rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "imports.parseError"));
    } finally {
      setStatus("idle");
    }
  }

  async function handleImport() {
    setError(null);
    setResult(null);
    setStatus("uploading");

    try {
      if (!defaultCategoryId || !defaultPurposeId) {
        throw new Error(t(locale, "statementImport.selectDefaults"));
      }
      if (!dateKey || !descriptionKey) {
        throw new Error(t(locale, "statementImport.mappingRequired"));
      }

      const rowsToSend = rawRows
        .map((row, index) => {
          if (excluded[index]) return null;
          const date = dateKey ? parseDate(row[dateKey]) : "";
          const description = descriptionKey ? String(row[descriptionKey] ?? "").trim() : "";
          const debit = debitKey ? parseNumber(row[debitKey]) : 0;
          const credit = creditKey ? parseNumber(row[creditKey]) : 0;

          let amount = 0;
          let type: "expense" | "income" = "expense";
          if (debit || credit) {
            if (debit) {
              amount = debit;
              type = "expense";
            } else {
              amount = credit;
              type = "income";
            }
          } else if (amountKey) {
            amount = Math.abs(parseNumber(row[amountKey]));
            if (typeKey) {
              const typeVal = String(row[typeKey] ?? "").toLowerCase();
              type = typeVal.includes("credit") || typeVal.includes("cr") ? "income" : "expense";
            }
          }

          if (!date || !description || !amount) {
            return null;
          }

          const overrideType = overrides[index];

          return {
            date,
            description,
            amount,
            type: overrideType ?? type,
          };
        })
        .filter(Boolean);

      const response = await fetch("/api/statements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          defaultCategoryId,
          defaultPurposeId,
          merchantId,
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

      if (merchantId) {
        localStorage.setItem(
          `${LOCAL_STORAGE_PREFIX}:${merchantId}`,
          JSON.stringify({ dateKey, descriptionKey, debitKey, creditKey, amountKey, typeKey })
        );
      }

      setResult({ insertedExpenses: data.insertedExpenses, insertedIncomes: data.insertedIncomes });
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "imports.uploadFailed"));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold">{t(locale, "statementImport.title")}</h2>
        <p className="text-xs text-slate-500">{t(locale, "statementImport.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
          {status === "parsing"
            ? t(locale, "imports.parsing")
            : t(locale, "statementImport.selectFile")}
          <input
            type="file"
            accept=".xlsx,.csv"
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
        <span className="text-xs text-slate-500">{t(locale, "statementImport.supportedNote")}</span>
      </div>

      {columns.length ? (
        <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
          <label>
            {t(locale, "statementImport.merchant")}
            <select
              value={merchantId}
              onChange={(event) => setMerchantId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.defaultCategory")}
            <select
              value={defaultCategoryId}
              onChange={(event) => setDefaultCategoryId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.defaultPurpose")}
            <select
              value={defaultPurposeId}
              onChange={(event) => setDefaultPurposeId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {purposes.map((purpose) => (
                <option key={purpose.id} value={purpose.id}>
                  {purpose.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.dateColumn")}
            <select
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.descriptionColumn")}
            <select
              value={descriptionKey}
              onChange={(event) => setDescriptionKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.debitColumn")}
            <select
              value={debitKey}
              onChange={(event) => setDebitKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.creditColumn")}
            <select
              value={creditKey}
              onChange={(event) => setCreditKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.amountColumn")}
            <select
              value={amountKey}
              onChange={(event) => setAmountKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t(locale, "statementImport.typeColumn")}
            <select
              value={typeKey}
              onChange={(event) => setTypeKey(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
            >
              <option value=""></option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {previewRows.length ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-800 bg-slate-950/70 px-4 py-2 text-xs uppercase text-slate-400">
              <span className="col-span-2">{t(locale, "common.date")}</span>
              <span className="col-span-5">{t(locale, "statementImport.description")}</span>
              <span className="col-span-2">{t(locale, "common.amount")}</span>
              <span className="col-span-2">{t(locale, "statementImport.type")}</span>
              <span className="col-span-1">{t(locale, "statementImport.include")}</span>
            </div>
            {previewRows.map((row) => (
              <div key={row.index} className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-slate-300">
                <span className="col-span-2">{row.date || "-"}</span>
                <span className="col-span-5 truncate">{row.description}</span>
                <span className="col-span-2">{row.amount ? row.amount.toFixed(2) : "-"}</span>
                <span className="col-span-2">
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
          <button
            type="button"
            onClick={handleImport}
            disabled={status === "uploading"}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "uploading" ? t(locale, "statementImport.uploading") : t(locale, "statementImport.import")}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {result ? (
        <p className="text-xs text-slate-300">
          {t(locale, "statementImport.result")} {result.insertedExpenses} {t(locale, "statementImport.expenses")}
          {" · "}
          {result.insertedIncomes} {t(locale, "statementImport.incomes")}
        </p>
      ) : null}
    </section>
  );
}
