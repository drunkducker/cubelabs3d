import type { SVGProps } from "react";
import Link from "next/link";
import { BookIcon, CubeIcon, UserIcon } from "./icons";

type IconProps = SVGProps<SVGSVGElement>;

type NavItem = {
  label: string;
  href: string;
  icon: (props: IconProps) => JSX.Element;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: CubeIcon },
  { label: "Play", href: "/play/3x3", icon: CubeIcon },
  { label: "Solvers", href: "/solve", icon: GridIcon },
  { label: "Learn", href: "/learn", icon: BookIcon },
  { label: "Challenges", href: "/leaderboard", icon: ShieldIcon },
  { label: "Leaderboard", href: "/leaderboard", icon: BarChartIcon },
  { label: "Profile", href: "/profile", icon: UserIcon },
];

/**
 * Shared mobile app navigation for app-style pages.
 *
 * The Learn prototype has its own embedded HTML nav for now; Next routes should
 * prefer this component so future routing, badges, and accessibility fixes land
 * in one place.
 */
export default function AppBottomNav({ active }: { active: string }) {
  return (
    <nav className="sticky bottom-0 -mx-4 mt-5 rounded-t-[12px] border border-[var(--border)] bg-[rgba(5,7,13,.86)] px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_40px_rgba(0,0,0,.45)] backdrop-blur-xl">
      <div className="grid grid-cols-7 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === active;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative flex min-w-0 flex-col items-center gap-1 rounded-[8px] px-1 py-1.5 text-[10px] font-semibold",
                isActive ? "text-white" : "text-slate-400",
              ].join(" ")}
            >
              {isActive ? (
                <span className="absolute -top-5 h-14 w-14 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,.55),rgba(139,92,246,.08)_60%,transparent_72%)] blur-sm" />
              ) : null}
              <Icon className="relative h-5 w-5" />
              <span className="relative max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const iconBase = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

function GridIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M12 3 5 6v5c0 4.4 2.8 8.4 7 10 4.2-1.6 7-5.6 7-10V6z" />
      <path d="m9.5 12 1.7 1.7 3.5-4" />
    </svg>
  );
}

function BarChartIcon(props: IconProps) {
  return (
    <svg {...iconBase(props)}>
      <path d="M5 20V10" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}
