import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const specPath = path.join(process.cwd(), "docs", "openapi.yaml");
  const spec = await readFile(specPath, "utf8");

  return new NextResponse(spec, {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
