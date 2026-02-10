"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { t, type Locale } from "@/lib/i18n";

const LOCAL_STORAGE_PREFIX = "statementMapping";

type Option = {
  id: string;
  name: string;
};

type RawRow = Record<string, unknown>;

type MappedRow = {
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

function normalizeKey(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const raw = String(value).replace(/\s/g, "");
  const normalized =
    raw.includes(",") && !raw.includes(".")
      ? raw.replace(/,/g, ".")
      : raw.includes(",") && raw.includes(".")
        ? raw.replace(/,/g, "")
        : raw;
  const cleaned = normalized.replace(/[^0-9.-]/g, "");
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
  let bestIndex = 0;
  let bestScore = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const joined = row.map((cell) => normalizeKey(cell)).filter(Boolean).join(" ");
    if (!joined) continue;

    const hasFecha = joined.includes("fecha") || joined.includes("date");
    const hasDebito = joined.includes("debito") || joined.includes("debit");
    const hasCredito = joined.includes("credito") || joined.includes("credit");
    const hasDetalle =
      joined.includes("detalle") ||
      joined.includes("detail") ||
      joined.includes("descripcion") ||
      joined.includes("description");
    const hasReferencia = joined.includes("referencia") || joined.includes("reference");
    const hasBalance = joined.includes("balance") || joined.includes("saldo");

    const score = [hasFecha, hasDebito, hasCredito, hasDetalle, hasReferencia, hasBalance].filter(Boolean)
      .length;
    if (hasFecha && (hasDebito || hasCredito) && score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 2 ? bestIndex : 0;
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
      const hasValues = Object.values(record).some(
        (value) => value !== null && value !== undefined && String(value).trim() !== ""
      );
      if (hasValues) {
        rows.push(record);
      }
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

function guessColumn(columns: string[], candidates: string[]) {
  const normalized = columns.map((col) => ({
    col,
    normalized: normalizeKey(col),
  }));

  for (const candidate of candidates) {
    const match = normalized.find((entry) => entry.normalized === candidate);
    if (match) return match.col;
  }

  for (const candidate of candidates) {
    const match = normalized.find((entry) => entry.normalized.includes(candidate));
    if (match) return match.col;
  }

  return "";
}

export default function StatementImport({
  categories,
  purposes,
  merchants,
  locale,
}: StatementImportProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "parsing">("idle");
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [merchantId, setMerchantId] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [defaultPurposeId, setDefaultPurposeId] = useState("");

  const [dateKey, setDateKey] = useState("");
  const [referenceKey, setReferenceKey] = useState("");
  const [detailKey, setDetailKey] = useState("");
  const [debitKey, setDebitKey] = useState("");
  const [creditKey, setCreditKey] = useState("");
  const [balanceKey, setBalanceKey] = useState("");

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rawRows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(String(key)));
    });
    return Array.from(keys);
  }, [rawRows]);

  useEffect(() => {
    if (!columns.length) return;
    setDateKey((prev) => prev || guessColumn(columns, ["fecha", "date"]));
    setReferenceKey((prev) => prev || guessColumn(columns, ["referencia", "reference", "ref"]));
    setDetailKey((prev) => prev || guessColumn(columns, ["detalle", "detail", "descripcion", "description"]));
    setDebitKey((prev) => prev || guessColumn(columns, ["debito", "debit"]));
    setCreditKey((prev) => prev || guessColumn(columns, ["credito", "credit"]));
    setBalanceKey((prev) => prev || guessColumn(columns, ["balance", "saldo"]));
  }, [columns]);

  useEffect(() => {
    if (!merchantId) return;
    const stored = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:${merchantId}`);
    if (!stored) return;
    try {
      const mapping = JSON.parse(stored) as {
        dateKey?: string;
        referenceKey?: string;
        detailKey?: string;
        debitKey?: string;
        creditKey?: string;
        balanceKey?: string;
      };
      setDateKey(mapping.dateKey ?? "");
      setReferenceKey(mapping.referenceKey ?? "");
      setDetailKey(mapping.detailKey ?? "");
      setDebitKey(mapping.debitKey ?? "");
      setCreditKey(mapping.creditKey ?? "");
      setBalanceKey(mapping.balanceKey ?? "");
    } catch {
      // ignore
    }
  }, [merchantId]);

  const preparedRows = useMemo(() => {
    if (!rawRows.length) return [] as MappedRow[];
    return rawRows
      .map((row, index) => {
        const dateValue = dateKey ? parseDate(row[dateKey]) : "";
        const referenceValue = referenceKey ? String(row[referenceKey] ?? "").trim() : "";
        const detailValue = detailKey ? String(row[detailKey] ?? "").trim() : "";
        const debit = debitKey ? parseNumber(row[debitKey]) : 0;
        const credit = creditKey ? parseNumber(row[creditKey]) : 0;
        const balance = balanceKey ? parseNumber(row[balanceKey]) : 0;
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
        }

        if (!dateValue || !amount || (!detailValue && !referenceValue)) {
          return null;
        }

        return {
          index,
          date: dateValue,
          reference: referenceValue,
          detail: detailValue,
          debit,
          credit,
          balance,
          amount,
          type,
        };
      })
      .filter(Boolean) as MappedRow[];
  }, [rawRows, dateKey, referenceKey, detailKey, debitKey, creditKey, balanceKey]);

  async function handleFile(file: File) {
    setError(null);
    setRawRows([]);
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

  function handleContinue() {
    setError(null);

    if (!defaultCategoryId || !defaultPurposeId) {
      setError(t(locale, "statementImport.selectDefaults"));
      return;
    }

    if (!dateKey || !referenceKey || !detailKey || !debitKey || !creditKey || !balanceKey) {
      setError(t(locale, "statementImport.mappingRequired"));
      return;
    }

    if (!preparedRows.length) {
      setError(t(locale, "statementImport.noRows"));
      return;
    }

    if (merchantId) {
      localStorage.setItem(
        `${LOCAL_STORAGE_PREFIX}:${merchantId}`,
        JSON.stringify({
          dateKey,
          referenceKey,
          detailKey,
          debitKey,
          creditKey,
          balanceKey,
        })
      );
    }

    const merchantName = merchants.find((merchant) => merchant.id === merchantId)?.name ?? "";
    const categoryName = categories.find((category) => category.id === defaultCategoryId)?.name ?? "";
    const purposeName = purposes.find((purpose) => purpose.id === defaultPurposeId)?.name ?? "";

    const payload = {
      locale,
      defaultCategoryId,
      defaultPurposeId,
      merchantId,
      merchantName,
      categoryName,
      purposeName,
      rows: preparedRows,
    };

    localStorage.setItem("statementImportReview", JSON.stringify(payload));
    router.push("/expenses/statement-review");
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
            {t(locale, "statementImport.referenceColumn")}
            <select
              value={referenceKey}
              onChange={(event) => setReferenceKey(event.target.value)}
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
            {t(locale, "statementImport.detailColumn")}
            <select
              value={detailKey}
              onChange={(event) => setDetailKey(event.target.value)}
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
            {t(locale, "statementImport.balanceColumn")}
            <select
              value={balanceKey}
              onChange={(event) => setBalanceKey(event.target.value)}
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

      {preparedRows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
          <span>
            {t(locale, "statementImport.rowsReady")} {preparedRows.length}
          </span>
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            {t(locale, "statementImport.review")}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

    </section>
  );
}
