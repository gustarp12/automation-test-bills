"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { createMerchant, type MerchantActionState } from "./actions";
import { t, type Locale } from "@/lib/i18n";

const initialState: MerchantActionState = { message: null };

type MerchantFormProps = {
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

export default function MerchantForm({ locale }: MerchantFormProps) {
  const [state, formAction] = useActionState(createMerchant, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.message === t(locale, "merchants.added")) {
      formRef.current?.reset();
    }
  }, [locale, state.message]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
    >
      <input type="hidden" name="locale" value={locale} />

      <label className="flex-1 text-sm">
        <span className="text-slate-300">{t(locale, "merchants.formLabel")}</span>
        <input
          name="name"
          type="text"
          required
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-400"
        />
      </label>

      <SubmitButton label={t(locale, "common.addMerchant")} />

      {state.message ? (
        <p className="basis-full text-sm text-slate-300">{state.message}</p>
      ) : null}
    </form>
  );
}
