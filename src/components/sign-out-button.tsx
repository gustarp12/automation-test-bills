"use client";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  label?: string;
};

export default function SignOutButton({ label = "Sign out" }: SignOutButtonProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="min-w-[110px] rounded-full border border-slate-700 px-4 py-2 text-center text-xs font-semibold text-slate-200 transition hover:border-slate-500"
    >
      {label}
    </button>
  );
}
