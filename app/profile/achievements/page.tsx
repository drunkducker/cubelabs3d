import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getProfileAchievementsPageData,
  type AchievementCatalogItem,
  type ProfileAchievement,
} from "@/app/lib/profile-service";
import { ChevronRightIcon, TrophyIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Achievements | Cube Lab 3D",
  description: "View unlocked Cube Labs badges, progress paths, and achievement rewards.",
};

export default async function ProfileAchievementsPage() {
  let data;
  try {
    data = await getProfileAchievementsPageData();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Sign in required.") redirect("/auth");
    redirect("/auth/email?error=Your%20session%20expired.%20Please%20log%20in%20again.");
  }

  const unlockedIds = new Set(data.unlocked.map((item) => item.achievement_id));
  const unlockedCards = data.unlocked.map(toUnlockedCard);
  const lockedCards = data.catalog
    .filter((item) => !unlockedIds.has(item.id))
    .map((item) => toLockedCard(item));
  const cards = [...unlockedCards, ...lockedCards];

  return (
    <main className="app-shell relative min-h-dvh w-full max-w-[460px] overflow-hidden px-4 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <div className="relative z-[1]">
        <BackLink />

        <section className="relative mt-5 overflow-hidden rounded-[8px] border border-[var(--border)] bg-[#050813] p-5 shadow-[0_18px_46px_rgba(0,0,0,.45)]">
          <div className="absolute right-[-18px] top-[-18px] h-32 w-32 rotate-45 rounded-[8px] border border-[rgba(245,185,66,.3)] bg-[rgba(245,185,66,.12)]" />
          <div className="relative z-[1]">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[var(--gold)]">Achievements</p>
            <h1 className="mt-2 text-[38px] font-black leading-none text-white">Badge Case</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Live unlocked badges from `user_achievements`, with the achievement catalog shown as upcoming goals.
            </p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Unlocked" value={String(data.unlocked.length)} />
          <Metric label="Catalog" value={String(data.catalog.length || data.unlocked.length)} />
          <Metric label="Points" value={String(totalPoints(data.unlocked))} />
        </section>

        {cards.length ? (
          <section className="mt-4 grid gap-3">
            {cards.map((achievement) => (
              <AchievementRow key={achievement.id} achievement={achievement} />
            ))}
          </section>
        ) : (
          <section className="mt-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-white/[.035] p-5 text-center">
            <TrophyIcon className="mx-auto h-10 w-10 text-[var(--gold)]" />
            <h2 className="mt-3 text-xl font-black text-white">No badges yet</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Complete tracked solves and future achievement jobs will unlock badges here.
            </p>
            <Link href="/leaderboard/3x3/play" className="cta-purple mt-4 grid min-h-11 place-items-center rounded-[8px] text-sm font-black text-white">
              Start Challenge
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

function BackLink() {
  return (
    <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
      <ChevronRightIcon className="h-4 w-4 rotate-180" />
      Back to profile
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[8px] border border-[var(--border)] bg-white/[.04] p-3 text-center">
      <p className="text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-[22px] font-black text-white">{value}</p>
    </article>
  );
}

function AchievementRow({ achievement }: { achievement: AchievementCard }) {
  return (
    <article className={["rounded-[8px] border p-4", achievement.unlocked ? "border-[var(--border)] bg-white/[.04]" : "border-dashed border-[var(--border)] bg-black/20 opacity-75"].join(" ")}>
      <div className="grid grid-cols-[54px_1fr_auto] items-center gap-3">
        <span className={`grid h-[54px] w-[54px] place-items-center rounded-[16px] border ${badgeTone(achievement.tone)}`}>
          <TrophyIcon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-black text-white">{achievement.name}</p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--muted)]">{achievement.description}</p>
          <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-slate-500">{achievement.category}</p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-black text-[var(--gold)]">{achievement.points} XP</p>
          <p className="mt-1 text-[11px] font-bold text-[var(--muted)]">{achievement.unlocked ? achievement.date : "Locked"}</p>
        </div>
      </div>
    </article>
  );
}

type AchievementCard = {
  id: string;
  name: string;
  description: string;
  category: string;
  points: number;
  date: string;
  tone: string;
  unlocked: boolean;
};

function toUnlockedCard(item: ProfileAchievement): AchievementCard {
  return {
    id: item.achievement_id,
    name: item.achievements?.name || item.achievement_id,
    description: item.achievements?.description || "Unlocked Cube Labs achievement.",
    category: item.achievements?.category || "general",
    points: item.achievements?.points || 0,
    date: formatShortMonth(item.unlocked_at),
    tone: achievementTone(item.achievements?.icon),
    unlocked: true,
  };
}

function toLockedCard(item: AchievementCatalogItem): AchievementCard {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    points: item.points,
    date: "Locked",
    tone: achievementTone(item.icon),
    unlocked: false,
  };
}

function totalPoints(achievements: ProfileAchievement[]) {
  return achievements.reduce((total, item) => total + (item.achievements?.points || 0), 0);
}

function formatShortMonth(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(createdAt));
}

function achievementTone(icon?: string | null) {
  if (icon === "trophy") return "gold";
  if (icon === "timer" || icon === "zap") return "blue";
  if (icon === "cube" || icon === "layers") return "green";
  return "purple";
}

function badgeTone(tone: string) {
  if (tone === "green") return "border-green-400/50 text-[var(--green)] shadow-[0_0_22px_rgba(52,208,88,.25)]";
  if (tone === "gold") return "border-yellow-400/60 text-[var(--gold)] shadow-[0_0_22px_rgba(245,185,66,.25)]";
  if (tone === "blue") return "border-blue-400/50 text-[var(--blue)] shadow-[0_0_22px_rgba(46,166,255,.25)]";
  return "border-purple-400/50 text-[var(--purple)] shadow-[0_0_22px_rgba(139,92,246,.25)]";
}
