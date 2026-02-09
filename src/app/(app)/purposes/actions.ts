"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type PurposeActionState = {
  message: string | null;
};

export async function createPurpose(
  _prevState: PurposeActionState,
  formData: FormData
): Promise<PurposeActionState> {
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
    return { message: t(locale, "purposes.adminOnly") };
  }

  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { message: t(locale, "purposes.nameRequired") };
  }

  const { error } = await supabase.from("purposes").insert({
    name,
    is_system: true,
    user_id: null,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/purposes");
  revalidatePath("/expenses");

  return { message: t(locale, "purposes.added") };
}

export async function deletePurpose(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("purposes").delete().eq("id", id);

  revalidatePath("/purposes");
  revalidatePath("/expenses");
}
