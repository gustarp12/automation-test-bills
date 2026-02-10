import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

const MAX_ROWS = 1000;

function normalizeHeader(value: unknown) {
  if (value === null || value === undefined || Number.isNaN(value as number)) {
    return "";
  }
  return String(value).trim().toLowerCase();
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseStatementDate(value: unknown, cutoffDate?: Date | null) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const str = String(value).trim();
  if (!str) return null;

  const parts = str.split("/");
  if (parts.length >= 2) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    if (!day || !month) return null;

    let year = cutoffDate?.getFullYear() ?? new Date().getFullYear();
    if (parts.length >= 3) {
      const y = Number(parts[2]);
      if (y) year = y < 100 ? 2000 + y : y;
    } else if (cutoffDate) {
      const cutoffMonth = cutoffDate.getMonth() + 1;
      if (month > cutoffMonth) {
        year = year - 1;
      }
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const asDate = new Date(str);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  return null;
}

function findCutoffDate(rows: unknown[][]) {
  for (let i = 0; i < rows.length - 1; i += 1) {
    const row = rows[i];
    if (row?.some((cell) => String(cell ?? "").toLowerCase().includes("fecha de corte"))) {
      for (let j = i + 1; j < rows.length; j += 1) {
        const candidate = rows[j]?.find((cell) => cell !== null && cell !== undefined && cell !== "");
        const date = parseStatementDate(candidate, null);
        if (date) return date;
      }
    }
  }
  return null;
}

function findHeaderRow(rows: unknown[][]) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const joined = row
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean)
      .join(" ");

    if (joined) {
      const joinedLower = joined.toLowerCase();
      if (
        joinedLower.includes("fecha") &&
        (joinedLower.includes("debito") ||
          joinedLower.includes("débitos") ||
          joinedLower.includes("credit") ||
          joinedLower.includes("créditos"))
      ) {
        return { index: i, row: row.length > 1 ? row : joined.split(/\s{2,}/) };
      }
    }

    const normalized = row.map(normalizeHeader);
    if (
      normalized.some((cell) => cell.startsWith("fecha")) &&
      (normalized.some((cell) => cell.includes("debito")) ||
        normalized.some((cell) => cell.includes("credito")))
    ) {
      return { index: i, row };
    }
  }

  return null;
}

function buildRows(rows: unknown[][], cutoffDate?: Date | null) {
  const header = findHeaderRow(rows);
  if (!header) return [];

  const headers = header.row.map(normalizeHeader);
  const dateIdx = headers.findIndex((cell) => cell.startsWith("fecha"));
  const refIdx = headers.findIndex((cell) => cell.startsWith("ref"));
  const detailIdx = headers.findIndex((cell) => cell.startsWith("detalle"));
  const debitIdx = headers.findIndex((cell) => cell.includes("debito"));
  const creditIdx = headers.findIndex((cell) => cell.includes("credito"));

  const detailExtraIdxs = headers
    .map((cell, idx) => ({ cell, idx }))
    .filter(({ cell, idx }) => !cell && detailIdx !== -1 && debitIdx !== -1 && idx > detailIdx && idx < debitIdx)
    .map(({ idx }) => idx);

  const output: {
    date: Date;
    ref: string | null;
    detail: string;
    debit: number;
    credit: number;
  }[] = [];

  for (let i = header.index + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const dateValue = row[dateIdx];
    const parsedDate = parseStatementDate(dateValue, cutoffDate ?? null);
    if (!parsedDate) {
      continue;
    }

    const detailParts = [] as string[];
    if (detailIdx !== -1 && row[detailIdx]) {
      detailParts.push(String(row[detailIdx]).trim());
    }
    detailExtraIdxs.forEach((idx) => {
      const value = row[idx];
      if (value) detailParts.push(String(value).trim());
    });

    const detail = detailParts.join(" ").trim();
    if (!detail) {
      continue;
    }

    const debit = debitIdx !== -1 ? parseNumber(row[debitIdx]) : 0;
    const credit = creditIdx !== -1 ? parseNumber(row[creditIdx]) : 0;

    if (!debit && !credit) {
      continue;
    }

    output.push({
      date: parsedDate,
      ref: refIdx !== -1 && row[refIdx] ? String(row[refIdx]) : null,
      detail,
      debit,
      credit,
    });

    if (output.length >= MAX_ROWS) break;
  }

  return output;
}

const CATEGORY_RULES = [
  { pattern: /supermerc|colmado|market|grocery/i, name: "Groceries" },
  { pattern: /restaurant|restaurante|comida|caf[eé]|bar/i, name: "Restaurants" },
  { pattern: /uber|taxi|metro|gas|combustible|peaje/i, name: "Transport" },
  { pattern: /luz|agua|internet|tel[eé]fono|claro|altice|edenorte|edesur/i, name: "Utilities" },
  { pattern: /renta|alquiler|lease/i, name: "Rent" },
  { pattern: /farmacia|medic|cl[ií]nica|hospital|seguro/i, name: "Health" },
  { pattern: /colegio|universidad|curso|clase/i, name: "Education" },
  { pattern: /cine|netflix|spotify|hbo|disney/i, name: "Entertainment" },
  { pattern: /hotel|airbnb|aerolinea|vuelo|avianca|american|delta/i, name: "Travel" },
  { pattern: /comisi[oó]n|cargo|fee|impuesto/i, name: "Fees" },
];

const PURPOSE_RULES = [
  { pattern: /ahorro|savings/i, name: "Savings" },
  { pattern: /inversi[oó]n|investment/i, name: "Investment" },
  { pattern: /impuesto|tax/i, name: "Taxes" },
  { pattern: /negocio|business/i, name: "Business" },
];

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const file = formData.get("file");
  const defaultCategoryId = String(formData.get("defaultCategoryId") ?? "").trim();
  const defaultPurposeId = String(formData.get("defaultPurposeId") ?? "").trim();

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: t(locale, "imports.uploadFailed") }, { status: 400 });
  }

  if (!defaultCategoryId || !defaultPurposeId) {
    return NextResponse.json({ message: t(locale, "expenses.categoryRequired") }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const allRows: {
    date: Date;
    ref: string | null;
    detail: string;
    debit: number;
    credit: number;
  }[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as unknown[][];
    const cutoffDate = findCutoffDate(rows);
    const rowsParsed = buildRows(rows, cutoffDate);
    allRows.push(...rowsParsed);
  });

  if (allRows.length === 0) {
    return NextResponse.json({ message: t(locale, "imports.empty") }, { status: 400 });
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name");
  const { data: purposes } = await supabase
    .from("purposes")
    .select("id, name");

  const categoryIdByName = new Map(
    (categories ?? []).map((cat) => [cat.name.toLowerCase(), cat.id])
  );
  const categoryNameById = new Map(
    (categories ?? []).map((cat) => [cat.id, cat.name])
  );
  const purposeIdByName = new Map(
    (purposes ?? []).map((purpose) => [purpose.name.toLowerCase(), purpose.id])
  );

  const expenses: {
    user_id: string;
    amount: number;
    currency: string;
    fx_rate_to_dop: number | null;
    amount_dop: number;
    expense_date: string;
    notes: string | null;
    category_id: string;
    purpose_id: string;
    merchant_id: string | null;
  }[] = [];

  const incomes: {
    user_id: string;
    amount: number;
    currency: string;
    fx_rate_to_dop: number | null;
    amount_dop: number;
    income_date: string;
    source: string;
    notes: string | null;
  }[] = [];

  const errors: { row: number; message: string }[] = [];

  allRows.forEach((row, index) => {
    const isoDate = row.date.toISOString().slice(0, 10);
    const detail = row.detail;

    if (row.debit > 0) {
      let categoryId: string | null = null;
      for (const rule of CATEGORY_RULES) {
        if (rule.pattern.test(detail)) {
          const match = categoryIdByName.get(rule.name.toLowerCase());
          if (match) {
            categoryId = match;
            break;
          }
        }
      }
      if (!categoryId) {
        categoryId = defaultCategoryId;
      }

      let purposeId: string | null = null;
      for (const rule of PURPOSE_RULES) {
        if (rule.pattern.test(detail)) {
          const match = purposeIdByName.get(rule.name.toLowerCase());
          if (match) {
            purposeId = match;
            break;
          }
        }
      }

      if (!purposeId && categoryId) {
        const categoryName = categoryNameById.get(categoryId)?.toLowerCase() ?? "";
        if (["groceries", "utilities", "rent", "health", "education"].includes(categoryName)) {
          purposeId = purposeIdByName.get("need") ?? null;
        }
        if (["restaurants", "entertainment", "travel"].includes(categoryName)) {
          purposeId = purposeIdByName.get("want") ?? null;
        }
      }

      if (!purposeId) {
        purposeId = defaultPurposeId;
      }

      if (!categoryId || !purposeId) {
        errors.push({ row: index + 1, message: t(locale, "expenses.categoryRequired") });
        return;
      }

      expenses.push({
        user_id: user.id,
        amount: row.debit,
        currency: "DOP",
        fx_rate_to_dop: null,
        amount_dop: row.debit,
        expense_date: isoDate,
        notes: row.ref ? `${detail} (Ref ${row.ref})` : detail,
        category_id: categoryId,
        purpose_id: purposeId,
        merchant_id: null,
      });
    }

    if (row.credit > 0) {
      incomes.push({
        user_id: user.id,
        amount: row.credit,
        currency: "DOP",
        fx_rate_to_dop: null,
        amount_dop: row.credit,
        income_date: isoDate,
        source: detail,
        notes: row.ref ? `Ref ${row.ref}` : null,
      });
    }
  });

  if (expenses.length) {
    const { error } = await supabase.from("expenses").insert(expenses);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  if (incomes.length) {
    const { error } = await supabase.from("incomes").insert(incomes);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    insertedExpenses: expenses.length,
    insertedIncomes: incomes.length,
    skipped: errors.length,
    errors: errors.slice(0, 20),
  });
}
