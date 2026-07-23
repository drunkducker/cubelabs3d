import { signOut } from "@/app/auth/actions";
import ProfilePlaceholderPage from "@/components/ProfilePlaceholderPage";

export default function ProfileSettingsPage() {
  return (
    <ProfilePlaceholderPage
      eyebrow="Cube ID"
      title="Profile Settings"
      description="Avatar, display name, Cube Tag, privacy, notification, and account controls will live here after the dashboard layout is approved."
      primaryHref="/profile"
      primaryLabel="Back to profile"
    >
      <form action={signOut} className="rounded-[8px] border border-[var(--border)] bg-white/[.035] p-4">
        <h2 className="font-black text-white">Account session</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Use this while the full settings panel is being built.</p>
        <button className="mt-4 min-h-11 w-full rounded-[8px] border border-[var(--border-2)] bg-black/20 text-sm font-black text-white">
          Sign out
        </button>
      </form>
    </ProfilePlaceholderPage>
  );
}
