"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { formatCurrency } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { createExpense, type ExpenseActionState } from "./actions";

const initialState: ExpenseActionState = { message: null };
const MAX_INTEGER_DIGITS = 12;

type Option = {
  id: string;
  name: string;
};

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string | null;
};

type ExpenseFormProps = {
  categories: Option[];
  merchants: Option[];
  currencies: CurrencyOption[];
  locale: Locale;
};

function SubmitButton({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || Boolean(disabled);

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}

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

export default function ExpenseForm({
  categories,
  merchants,
  currencies,
  locale,
}: ExpenseFormProps) {
  const [state, formAction] = useActionState(createExpense, initialState);
  const [currency, setCurrency] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [fxRate, setFxRate] = useState("");

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

  const today = new Date().toISOString().slice(0, 10);
  const availableCurrencies =
    currencies.length > 0
      ? currencies
      : [{ code: "DOP", name: "Dominican Peso", symbol: "RD$" }];
  const hasCategories = categories.length > 0;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
    >
      <input type="hidden" name="amount" value={amountRaw} />
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.amount")}</span>
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
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          {amountError ? (
            <p className="mt-2 text-xs text-rose-300">{amountError}</p>
          ) : null}
        </label>

        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.currency")}</span>
          <select
            name="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            required
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
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
        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "expenses.fxRate")}</span>
          <input
            name="fx_rate_to_dop"
            type="number"
            step="0.0001"
            required
            onChange={(event) => setFxRate(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
          {converted ? (
            <p className="mt-2 text-xs text-slate-400">
              {t(locale, "expenses.converted")} {formatCurrency(converted, "DOP", locale)}
            </p>
          ) : null}
        </label>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.category")}</span>
          <select
            name="category_id"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
            defaultValue=""
            required
            disabled={!hasCategories}
          >
            <option value=""></option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {!hasCategories ? (
            <p className="mt-2 text-xs text-amber-300">
              {t(locale, "expenses.noCategories")}
            </p>
          ) : null}
        </label>

        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.merchant")}</span>
          <select
            name="merchant_id"
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
            defaultValue=""
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.date")}</span>
          <input
            name="expense_date"
            type="date"
            defaultValue={today}
            required
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
        </label>

        <label className="text-sm">
          <span className="text-slate-300">{t(locale, "common.notes")}</span>
          <input
            name="notes"
            type="text"
            placeholder={t(locale, "common.optional")}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      {state.message ? (
        <p className="text-sm text-slate-300">{state.message}</p>
      ) : null}

      <SubmitButton label={t(locale, "common.addExpense")} disabled={!hasCategories} />
    </form>
  );
}
