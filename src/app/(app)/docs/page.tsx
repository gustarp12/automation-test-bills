import { redirect } from "next/navigation";

import SwaggerViewer from "./swagger-ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export default async function DocsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const locale = await getLocale();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">API</p>
        <h1 className="text-3xl font-semibold">Swagger UI</h1>
        <p className="text-sm text-slate-400">
          {t(locale, "common.appName")} OpenAPI
        </p>
      </div>
      <SwaggerViewer />
    </div>
  );
}
