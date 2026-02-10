"use client";

import { useActionState, useMemo, useRef, useState } from "react";

import { formatCurrency, formatDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { updateExpense, deleteExpense, type ExpenseActionState } from "./actions";

const MAX_INTEGER_DIGITS = 12;

const initialState: ExpenseActionState = { message: null };

type Option = {
  id: string;
  name: string;
};

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
};

type ExpenseRowData = {
  id: string;
  amount: string;
  currency: string;
  amount_dop: string;
  expense_date: string;
  notes: string | null;
  fx_rate_to_dop: string | null;
  category_id: string | null;
  purpose_id: string | null;
  merchant_id: string | null;
  merchants?: { name?: string } | null;
  categories?: { name?: string } | null;
  purposes?: { name?: string } | null;
};

type ExpenseRowProps = {
  expense: ExpenseRowData;
  categories: Option[];
  purposes: Option[];
  merchants: Option[];
  currencies: CurrencyOption[];
  locale: Locale;
};

function sanitizeAmountInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [rawInt = "", rawDec = ""] = cleaned.split(".");
  const intPart = rawInt.replace(/^0+(?=\d)/, "");
  const decPart = rawDec.slice(0, 2);
  const raw = decPart ? `${intPart}.${decPart}` : intPart;
  return raw;
}

function formatAmountDisplay(raw: string, locale: Locale) {
  if (!raw) {
    return "";
  }
  const numeric = Number(raw);
  if (Number.isNaN(numeric)) {
    return raw;
  }
  const localeTag = locale === "es" ? "es-DO" : "en-US";
  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function countIntegerDigits(raw: string) {
  const [intPart = ""] = raw.split(".");
  const trimmed = intPart.replace(/^0+(?=\d)/, "");
  return trimmed.length || 1;
}

export default function ExpenseRow({
  expense,
  categories,
  purposes,
  merchants,
  currencies,
  locale,
}: ExpenseRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState(updateExpense, initialState);
  const [currency, setCurrency] = useState(expense.currency ?? "");
  const [amountRaw, setAmountRaw] = useState(String(expense.amount ?? ""));
  const [amountDisplay, setAmountDisplay] = useState(() =>
    formatAmountDisplay(String(expense.amount ?? ""), locale)
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [fxRate, setFxRate] = useState(expense.fx_rate_to_dop ?? "");
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  const availableCurrencies =
    currencies.length > 0
      ? currencies
      : [{ code: "DOP", name: "Dominican Peso", symbol: "RD$" }];

  const converted = useMemo(() => {
    if (!currency || currency === "DOP") {
      return null;
    }
    const amountValue = Number(amountRaw);
    const fxValue = Number(fxRate);

    if (!amountValue || !fxValue || Number.isNaN(amountValue) || Number.isNaN(fxValue)) {
      return null;
    }

    return amountValue * fxValue;
  }, [amountRaw, currency, fxRate]);

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-16 gap-2 text-sm text-slate-200">
        <span className="col-span-3 text-slate-100">
          {expense.merchants?.name ?? "—"}
        </span>
        <span className="col-span-2 text-slate-300">{expense.categories?.name ?? "—"}</span>
        <span className="col-span-2 text-slate-500">{expense.purposes?.name ?? "—"}</span>
        <span className="col-span-2 text-slate-400">
          {formatDate(expense.expense_date, locale)}
        </span>
        <span className="col-span-2">
          {formatCurrency(expense.amount, expense.currency, locale)}
        </span>
        <span className="col-span-2">
          {formatCurrency(expense.amount_dop, "DOP", locale)}
        </span>
        <span className="col-span-1 text-xs text-slate-500">
          {expense.notes ? "•" : ""}
        </span>
        <span className="col-span-2 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-200 transition hover:border-slate-500"
          >
            {isEditing ? t(locale, "common.cancel") : t(locale, "common.edit")}
          </button>
          <form ref={deleteFormRef} action={deleteExpense}>
            <input type="hidden" name="id" value={expense.id} />
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t(locale, "expenses.deleteConfirm"))) {
                  deleteFormRef.current?.requestSubmit();
                }
              }}
              className="rounded-full border border-rose-500/70 px-3 py-1 font-semibold text-rose-200 transition hover:border-rose-400"
            >
              {t(locale, "common.delete")}
            </button>
          </form>
        </span>
      </div>

      {isEditing ? (
        <form
          action={formAction}
          className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          <input type="hidden" name="id" value={expense.id} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="amount" value={amountRaw} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              {t(locale, "common.amount")}
              <input
                type="text"
                inputMode="decimal"
                required
                value={amountDisplay}
                onChange={(event) => {
                  const raw = sanitizeAmountInput(event.target.value);
                  setAmountRaw(raw);
                  setAmountDisplay(raw);
                  if (raw && countIntegerDigits(raw) <= MAX_INTEGER_DIGITS) {
                    setAmountError(null);
                  }
                }}
                onFocus={() => setAmountDisplay(amountRaw)}
                onBlur={() => {
                  if (!amountRaw) {
                    setAmountError(null);
                    setAmountDisplay("");
                    return;
                  }
                  if (countIntegerDigits(amountRaw) > MAX_INTEGER_DIGITS) {
                    setAmountError(t(locale, "expenses.amountError"));
                    setAmountRaw("");
                    setAmountDisplay("");
                    return;
                  }
                  setAmountError(null);
                  setAmountDisplay(formatAmountDisplay(amountRaw, locale));
                }}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
              {amountError ? (
                <span className="mt-1 block text-xs text-rose-300">{amountError}</span>
              ) : null}
            </label>

            <label className="text-xs text-slate-300">
              {t(locale, "common.currency")}
              <select
                name="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              >
                <option value=""></option>
                {availableCurrencies.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.code} {option.name ? `— ${option.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {currency && currency !== "DOP" ? (
            <label className="text-xs text-slate-300">
              {t(locale, "expenses.fxRate")}
              <input
                name="fx_rate_to_dop"
                type="number"
                step="0.0001"
                required
                value={fxRate}
                onChange={(event) => setFxRate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
              {converted ? (
                <span className="mt-1 block text-xs text-slate-400">
                  {t(locale, "expenses.converted")} {formatCurrency(converted, "DOP", locale)}
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-300">
              {t(locale, "common.category")}
              <select
                name="category_id"
                defaultValue={expense.category_id ?? ""}
                required
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
              {t(locale, "common.purpose")}
              <select
                name="purpose_id"
                defaultValue={expense.purpose_id ?? ""}
                required
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

            <label className="text-xs text-slate-300">
              {t(locale, "common.merchant")}
              <select
                name="merchant_id"
                defaultValue={expense.merchant_id ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              >
                <option value=""></option>
                {merchants.map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              {t(locale, "common.date")}
              <input
                name="expense_date"
                type="date"
                defaultValue={expense.expense_date}
                required
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>

            <label className="text-xs text-slate-300">
              {t(locale, "common.notes")}
              <input
                name="notes"
                type="text"
                defaultValue={expense.notes ?? ""}
                placeholder={t(locale, "common.optional")}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          {state.message ? (
            <p className="text-xs text-slate-300">{state.message}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {t(locale, "common.save")}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.cancel")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
