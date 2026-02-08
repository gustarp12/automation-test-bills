"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type MerchantActionState = {
  message: string | null;
};

export async function createMerchant(
  _prevState: MerchantActionState,
  formData: FormData
): Promise<MerchantActionState> {
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
    return { message: t(locale, "merchants.adminOnly") };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { message: t(locale, "merchants.nameRequired") };
  }

  const { error } = await supabase.from("merchants").insert({
    name,
    user_id: user.id,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/merchants");
  return { message: t(locale, "merchants.added") };
}

export async function deleteMerchant(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("merchants").delete().eq("id", id);

  revalidatePath("/merchants");
}
