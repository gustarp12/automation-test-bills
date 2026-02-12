"use client";

import { useActionState, useEffect, useState } from "react";

import { formatCurrency } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n";
import { updateBudget, deleteBudget, type BudgetActionState } from "./actions";

type BudgetRow = {
  id: string;
  amount: string | number;
  month: string;
  categories?: { name?: string } | null;
};

type BudgetRowProps = {
  budget: BudgetRow;
  locale: Locale;
};

const initialState: BudgetActionState = { message: null };

export default function BudgetRow({ budget, locale }: BudgetRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState(String(budget.amount ?? ""));
  const [state, formAction] = useActionState(updateBudget, initialState);

  useEffect(() => {
    if (state.message === t(locale, "budgets.updated")) {
      setIsEditing(false);
    }
  }, [state.message, locale]);

  useEffect(() => {
    setAmount(String(budget.amount ?? ""));
  }, [budget.id, budget.amount]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm">
      <div>
        <p className="font-medium">{budget.categories?.name ?? "—"}</p>
        <p className="text-xs text-slate-500">
          {t(locale, "budgets.monthLabel")} {budget.month}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {!isEditing ? (
          <span className="text-sm font-semibold">
            {formatCurrency(Number(budget.amount), "DOP", locale)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
        >
          {isEditing ? t(locale, "common.cancel") : t(locale, "common.edit")}
        </button>
        <form action={deleteBudget}>
          <input type="hidden" name="id" value={budget.id} />
          <button type="submit" className="text-xs text-rose-300 hover:text-rose-200">
            {t(locale, "common.delete")}
          </button>
        </form>
      </div>

      {isEditing ? (
        <form action={formAction} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <input type="hidden" name="id" value={budget.id} />
          <input type="hidden" name="locale" value={locale} />
          <label className="text-xs text-slate-300">
            {t(locale, "budgets.amount")}
            <input
              name="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
            />
          </label>

          {state.message ? (
            <p className="mt-2 text-xs text-slate-300">{state.message}</p>
          ) : null}

          <div className="mt-3 flex gap-2">
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
