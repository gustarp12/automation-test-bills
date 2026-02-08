"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type CurrencyActionState = {
  message: string | null;
};

export async function createCurrency(
  _prevState: CurrencyActionState,
  formData: FormData
): Promise<CurrencyActionState> {
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: t(locale, "errors.signInRequired") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { message: t(locale, "currencies.adminOnly") };
  }

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "on") === "on";

  if (!code) {
    return { message: t(locale, "currencies.codeRequired") };
  }

  if (!name) {
    return { message: t(locale, "currencies.nameRequired") };
  }

  const { error } = await supabase.from("currencies").insert({
    code,
    name,
    symbol: symbol || null,
    is_active: isActive,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/currencies");
  revalidatePath("/expenses");
  return { message: t(locale, "currencies.added") };
}

export async function deleteCurrency(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("currencies").delete().eq("id", id);

  revalidatePath("/currencies");
  revalidatePath("/expenses");
}
