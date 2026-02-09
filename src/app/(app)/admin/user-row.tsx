import { setAdminStatus } from "./actions";
import { t, type Locale } from "@/lib/i18n";

type AdminUserRowProps = {
  profile: {
    id: string;
    email: string | null;
    is_admin: boolean;
    created_at: string;
  };
  currentUserId: string;
  locale: Locale;
};

export default function AdminUserRow({
  profile,
  currentUserId,
  locale,
}: AdminUserRowProps) {
  const isSelf = profile.id === currentUserId;
  const actionLabel = profile.is_admin
    ? t(locale, "admin.removeAdmin")
    : t(locale, "admin.makeAdmin");

  return (
    <div className="grid grid-cols-12 items-center gap-2 py-3 text-sm text-slate-200">
      <div className="col-span-5">
        <p className="font-medium">{profile.email ?? profile.id}</p>
        {profile.email ? null : (
          <p className="text-xs text-slate-500">{t(locale, "admin.missingEmail")}</p>
        )}
      </div>
      <div className="col-span-3 text-xs text-slate-400">
        {new Date(profile.created_at).toISOString().slice(0, 10)}
      </div>
      <div className="col-span-2 text-xs">
        {profile.is_admin ? t(locale, "admin.adminRole") : t(locale, "admin.userRole")}
      </div>
      <div className="col-span-2 flex justify-end">
        <form action={setAdminStatus}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={profile.id} />
          <input type="hidden" name="make_admin" value={String(!profile.is_admin)} />
          <button
            type="submit"
            disabled={isSelf}
            className="text-xs font-semibold text-emerald-300 transition hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            {isSelf ? t(locale, "admin.currentUser") : actionLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
