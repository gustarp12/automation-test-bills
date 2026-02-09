"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLocale, t } from "@/lib/i18n";

export async function setAdminStatus(formData: FormData): Promise<void> {
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return;
  }

  const targetId = String(formData.get("id") ?? "").trim();
  const makeAdmin = String(formData.get("make_admin") ?? "") === "true";

  if (!targetId) {
    return;
  }

  if (targetId === user.id) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_admin: makeAdmin })
    .eq("id", targetId);

  if (error) {
    return;
  }

  revalidatePath("/admin");
}
