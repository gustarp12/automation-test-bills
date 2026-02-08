import { redirect } from "next/navigation";

import CategoryForm from "./category-form";
import { deleteCategory } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

type CategoryRow = {
  id: string;
  name: string;
  is_system: boolean;
};

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, is_system")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  const systemCategories = (categories ?? []).filter((cat) => cat.is_system);
  const personalCategories = (categories ?? []).filter((cat) => !cat.is_system);

  const isAdmin = Boolean(profile?.is_admin);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          {t(locale, "nav.categories")}
        </p>
        <h1 className="text-3xl font-semibold">{t(locale, "categories.title")}</h1>
        <p className="text-sm text-slate-400">{t(locale, "categories.subtitle")}</p>
      </div>

      {isAdmin ? <CategoryForm canCreateSystem locale={locale} /> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(locale, "categories.systemTitle")}</h2>
          <span className="text-xs text-slate-500">{t(locale, "categories.systemNote")}</span>
        </div>
        <div className="grid gap-2">
          {systemCategories.length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "categories.noSystem")}</p>
          ) : (
            (systemCategories as CategoryRow[]).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
              >
                <span>{category.name}</span>
                {isAdmin ? (
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      {t(locale, "common.delete")}
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t(locale, "categories.personalTitle")}</h2>
          <span className="text-xs text-slate-500">{t(locale, "categories.personalNote")}</span>
        </div>
        <div className="grid gap-2">
          {personalCategories.length === 0 ? (
            <p className="text-sm text-slate-500">{t(locale, "categories.noPersonal")}</p>
          ) : (
            (personalCategories as CategoryRow[]).map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm"
              >
                <span>{category.name}</span>
                {isAdmin ? (
                  <form action={deleteCategory}>
                    <input type="hidden" name="id" value={category.id} />
                    <button
                      type="submit"
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      {t(locale, "common.delete")}
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
