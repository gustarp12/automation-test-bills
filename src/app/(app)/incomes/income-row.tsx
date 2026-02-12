"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency, formatDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { updateIncome, deleteIncome, type IncomeActionState } from "./actions";

const MAX_INTEGER_DIGITS = 12;

const initialState: IncomeActionState = { message: null };

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
};

type IncomeRowData = {
  id: string;
  amount: string;
  currency: string;
  amount_dop: string;
  income_date: string;
  source: string | null;
  notes: string | null;
  fx_rate_to_dop?: string | null;
};

type IncomeRowProps = {
  income: IncomeRowData;
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

export default function IncomeRow({ income, currencies, locale }: IncomeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState(updateIncome, initialState);
  const [currency, setCurrency] = useState(income.currency ?? "");
  const [amountRaw, setAmountRaw] = useState(String(income.amount ?? ""));
  const [amountDisplay, setAmountDisplay] = useState(() =>
    formatAmountDisplay(String(income.amount ?? ""), locale)
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [fxRate, setFxRate] = useState(income.fx_rate_to_dop ?? "");
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.message === t(locale, "income.updated")) {
      setIsEditing(false);
    }
  }, [state.message, locale]);

  useEffect(() => {
    setCurrency(income.currency ?? "");
    setAmountRaw(String(income.amount ?? ""));
    setAmountDisplay(formatAmountDisplay(String(income.amount ?? ""), locale));
    setFxRate(income.fx_rate_to_dop ?? "");
  }, [income.id, income.amount, income.currency, income.fx_rate_to_dop, locale]);

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
      <div className="grid grid-cols-14 gap-2 text-sm text-slate-200">
        <span className="col-span-4">{income.source ?? "—"}</span>
        <span className="col-span-3 text-slate-400">{formatDate(income.income_date, locale)}</span>
        <span className="col-span-3 text-emerald-300">
          {formatCurrency(income.amount, income.currency, locale)}
          <span className="ml-2 text-xs text-slate-500">
            {formatCurrency(income.amount_dop, "DOP", locale)}
          </span>
        </span>
        <span className="col-span-2 text-xs text-slate-400">{income.notes ?? "—"}</span>
        <span className="col-span-2 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-200 transition hover:border-slate-500"
          >
            {isEditing ? t(locale, "common.cancel") : t(locale, "common.edit")}
          </button>
          <form ref={deleteFormRef} action={deleteIncome}>
            <input type="hidden" name="id" value={income.id} />
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t(locale, "income.deleteConfirm"))) {
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
          <input type="hidden" name="id" value={income.id} />
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
                    setAmountError(t(locale, "income.amountTooLarge"));
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
              {t(locale, "income.fxRate")}
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
                  {t(locale, "income.converted")} {formatCurrency(converted, "DOP", locale)}
                </span>
              ) : null}
            </label>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-300">
              {t(locale, "income.source")}
              <input
                name="source"
                type="text"
                defaultValue={income.source ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>

            <label className="text-xs text-slate-300">
              {t(locale, "common.date")}
              <input
                name="income_date"
                type="date"
                defaultValue={income.income_date}
                required
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <label className="text-xs text-slate-300">
            {t(locale, "common.notes")}
            <input
              name="notes"
              type="text"
              defaultValue={income.notes ?? ""}
              placeholder={t(locale, "common.optional")}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            />
          </label>

          {state.message ? (
            <p className="text-xs text-slate-300">{state.message}</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              className="min-w-[120px] rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {t(locale, "common.save")}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="min-w-[120px] rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
            >
              {t(locale, "common.cancel")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
