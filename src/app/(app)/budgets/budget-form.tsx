"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { saveBudget, type BudgetActionState } from "./actions";
import { t, type Locale } from "@/lib/i18n";

const initialState: BudgetActionState = { message: null };

type CategoryOption = {
  id: string;
  name: string;
};

type BudgetFormProps = {
  categories: CategoryOption[];
  locale: Locale;
  monthDefault: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? `${label}...` : label}
    </button>
  );
}

export default function BudgetForm({ categories, locale, monthDefault }: BudgetFormProps) {
  const [state, formAction] = useActionState(saveBudget, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.message === t(locale, "budgets.saved")) {
      formRef.current?.reset();
      const monthInput = formRef.current?.querySelector<HTMLInputElement>(
        "input[name='month']"
      );
      if (monthInput) {
        monthInput.value = monthDefault;
      }
    }
  }, [locale, monthDefault, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <label className="text-sm">
        <span className="text-slate-300">{t(locale, "budgets.month")}</span>
        <input
          name="month"
          type="month"
          defaultValue={monthDefault}
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
          required
        />
      </label>
      <label className="min-w-[220px] flex-1 text-sm">
        <span className="text-slate-300">{t(locale, "common.category")}</span>
        <select
          name="category_id"
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
          defaultValue=""
          required
        >
          <option value=""></option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-slate-300">{t(locale, "budgets.amount")}</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
          required
        />
      </label>
      <SubmitButton label={t(locale, "budgets.save")} />
      {state.message ? (
        <p className="basis-full text-sm text-slate-300">{state.message}</p>
      ) : null}
    </form>
  );
}
