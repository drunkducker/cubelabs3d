"use client";

/*
 * Cookie consent banner + settings modal.
 *
 * Mounted once from the root layout. Shows the banner until a decision is
 * recorded for the current policy version, exposes a settings modal that can
 * be reopened at any time, and honors a Global Privacy Control signal by
 * pre-selecting the opt-out state for advertising.
 *
 * Any component (footer link, Cookie Policy page, a settings route) can reopen
 * the modal without prop drilling by calling `openCookieSettings()`, which
 * dispatches a window event this provider listens for.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CATEGORY_META,
  OPTIONAL_CATEGORIES,
  allOptionalConsent,
  consentAllows,
  detectGpc,
  noOptionalConsent,
  readConsent,
  writeConsent,
  type ConsentCategories,
  type ConsentCategory,
  type ConsentRecord,
  type OptionalCategory,
} from "@/lib/consent";

const OPEN_SETTINGS_EVENT = "cubelabs:open-cookie-settings";

/** Reopen the cookie settings modal from anywhere in the app. */
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  }
}

type ConsentContextValue = {
  /** Current decision, or null before any decision is recorded. */
  record: ConsentRecord | null;
  /** True once the client has read stored state (avoids hydration flashes). */
  ready: boolean;
  allows: (category: ConsentCategory) => boolean;
  openSettings: () => void;
};

const ConsentContext = createContext<ConsentContextValue>({
  record: null,
  ready: false,
  allows: (category) => category === "necessary",
  openSettings: () => {},
});

export function useConsent() {
  return useContext(ConsentContext);
}

export default function CookieConsent({ children }: { children?: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [gpc, setGpc] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Read stored state after mount so server and client render the same markup.
  useEffect(() => {
    const stored = readConsent();
    setRecord(stored);
    setGpc(detectGpc());
    setShowBanner(!stored);
    setReady(true);
  }, []);

  useEffect(() => {
    const onOpen = () => setShowSettings(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
  }, []);

  const persist = useCallback(
    (categories: ConsentCategories) => {
      const saved = writeConsent(categories, gpc);
      setRecord(saved);
      setShowBanner(false);
      setShowSettings(false);
    },
    [gpc],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      record,
      ready,
      allows: (category) => (ready ? consentAllows(category) : category === "necessary"),
      openSettings: () => setShowSettings(true),
    }),
    [record, ready],
  );

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {ready && showBanner && !showSettings && (
        <ConsentBanner
          gpc={gpc}
          onAcceptAll={() => persist(allOptionalConsent())}
          onRejectAll={() => persist(noOptionalConsent())}
          onCustomize={() => setShowSettings(true)}
        />
      )}
      {showSettings && (
        <SettingsModal
          initial={record?.categories ?? (gpc ? noOptionalConsent() : noOptionalConsent())}
          gpc={gpc}
          onSave={persist}
          onAcceptAll={() => persist(allOptionalConsent())}
          onRejectAll={() => persist(noOptionalConsent())}
          onClose={() => {
            setShowSettings(false);
            // Re-show the banner if the user closed settings without deciding.
            if (!readConsent()) setShowBanner(true);
          }}
        />
      )}
    </ConsentContext.Provider>
  );
}

function ConsentBanner({
  gpc,
  onAcceptAll,
  onRejectAll,
  onCustomize,
}: {
  gpc: boolean;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onCustomize: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border-2)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-md sm:p-5">
        <p className="text-sm text-[var(--text)]">
          We use strictly necessary cookies to run Cube Lab 3D. With your permission we also use
          preferences, analytics, and advertising cookies. Nothing nonessential runs until you choose.
        </p>
        {gpc && (
          <p className="mt-2 text-xs font-semibold text-[var(--cyan)]">
            Global Privacy Control detected — advertising and sharing are pre-set to off.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-xl border border-[var(--border-2)] px-4 py-2 text-sm font-extrabold text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Reject nonessential
          </button>
          <button
            type="button"
            onClick={onCustomize}
            className="rounded-xl px-4 py-2 text-sm font-extrabold text-[var(--blue)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Customize
          </button>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          See our <a href="/cookies" className="text-[var(--blue)] hover:underline">Cookie Policy</a>.
        </p>
      </div>
    </div>
  );
}

export function SettingsModal({
  initial,
  gpc,
  onSave,
  onAcceptAll,
  onRejectAll,
  onClose,
}: {
  initial: ConsentCategories;
  gpc: boolean;
  onSave: (categories: ConsentCategories) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ConsentCategories>(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (key: OptionalCategory) => setDraft((d) => ({ ...d, [key]: !d[key] }));

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie settings"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border-2)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-[var(--text)]">Cookie settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cookie settings"
            className="rounded-lg px-2 py-1 text-[var(--muted)] hover:text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Choose which cookies Cube Lab 3D may use. You can change this at any time.
        </p>
        {gpc && (
          <p className="mt-2 rounded-lg border border-[var(--border-2)] bg-[var(--bg-2)] px-3 py-2 text-xs font-semibold text-[var(--cyan)]">
            A Global Privacy Control signal was detected. We honor it by opting you out of advertising
            and data sharing unless you explicitly turn it on here.
          </p>
        )}

        <ul className="mt-4 grid gap-3">
          {CATEGORY_META.map((meta) => {
            const optional = meta.id !== "necessary";
            const checked = optional ? draft[meta.id as OptionalCategory] : true;
            return (
              <li key={meta.id} className="rounded-xl border border-[var(--border)] p-3">
                <label className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-[var(--text)]">{meta.title}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{meta.summary}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 flex-none accent-[var(--blue)]"
                    checked={checked}
                    disabled={meta.required}
                    aria-label={`${meta.title}${meta.required ? " (always on)" : ""}`}
                    onChange={() => optional && toggle(meta.id as OptionalCategory)}
                  />
                </label>
                {meta.required && (
                  <span className="mt-2 inline-block text-[10px] font-black uppercase tracking-wide text-[var(--faint)]">
                    Always on
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-extrabold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Save choices
          </button>
          <button
            type="button"
            onClick={onAcceptAll}
            className="rounded-xl border border-[var(--border-2)] px-4 py-2 text-sm font-extrabold text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-xl border border-[var(--border-2)] px-4 py-2 text-sm font-extrabold text-[var(--text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
          >
            Reject nonessential
          </button>
        </div>
      </div>
    </div>
  );
}

/** Re-export so callers can build UI (e.g. inventory tables) without a second import. */
export { OPTIONAL_CATEGORIES };
