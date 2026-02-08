"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { createCurrency, type CurrencyActionState } from "./actions";
import { t, type Locale } from "@/lib/i18n";

const initialState: CurrencyActionState = { message: null };

type CurrencyFormProps = {
  locale: Locale;
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

export default function CurrencyForm({ locale }: CurrencyFormProps) {
  const [state, formAction] = useActionState(createCurrency, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.message === t(locale, "currencies.added")) {
      formRef.current?.reset();
    }
  }, [locale, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-4"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="text-sm">
        <span className="text-slate-300">{t(locale, "currencies.code")}</span>
        <input
          name="code"
          type="text"
          placeholder="DOP"
          required
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
        />
      </label>
      <label className="text-sm md:col-span-2">
        <span className="text-slate-300">{t(locale, "currencies.name")}</span>
        <input
          name="name"
          type="text"
          placeholder="Dominican Peso"
          required
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-300">{t(locale, "currencies.symbol")}</span>
        <input
          name="symbol"
          type="text"
          placeholder="RD$"
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
        />
      </label>
      <label className="flex items-center gap-2 text-sm md:col-span-4">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-400"
        />
        <span className="text-slate-300">{t(locale, "common.active")}</span>
      </label>

      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
        <SubmitButton label={t(locale, "common.addCurrency")} />
        {state.message ? (
          <p className="text-sm text-slate-300">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
