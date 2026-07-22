"use client";

import { useState } from "react";

type Props = {
  name: string;
  autoComplete: string;
  minLength?: number;
  label?: string;
};

export default function PasswordField({ name, autoComplete, minLength, label = "Password" }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <span className="relative block">
        <input
          className="min-h-12 w-full rounded-xl border border-[var(--border-2)] bg-black/20 px-4 pr-14 text-base text-white"
          name={name}
          type={visible ? "text" : "password"}
          minLength={minLength}
          required
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 right-0 w-14 text-sm font-black text-[var(--blue)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "HIDE" : "SHOW"}
        </button>
      </span>
    </label>
  );
}
