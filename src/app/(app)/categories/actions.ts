"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export type CategoryActionState = {
  message: string | null;
};

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
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
    return { message: t(locale, "categories.adminOnly") };
  }

  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("scope") ?? "system").trim();

  if (!name) {
    return { message: t(locale, "categories.nameRequired") };
  }

  const isSystem = scope !== "personal";

  const { error } = await supabase.from("categories").insert({
    name,
    is_system: isSystem,
    user_id: isSystem ? null : user.id,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/categories");
  return {
    message: isSystem ? t(locale, "categories.systemAdded") : t(locale, "categories.added"),
  };
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from("categories").delete().eq("id", id);

  revalidatePath("/categories");
}
