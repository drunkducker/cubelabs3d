"use client";

import { useMemo, useState } from "react";

/*
 * Lightweight sortable/filterable data table. Client-side sort + filter over an
 * already-paginated page of rows (we never ship the whole table to the browser;
 * the server bounds the result set). Dark-theme, accessible headers, and a
 * mobile fallback that stacks each row as a card.
 */

export type Column<T> = {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  filterKeys,
  emptyText = "No records.",
  getRowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  filterKeys?: (keyof T & string)[];
  emptyText?: string;
  getRowKey: (row: T) => string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let out = rows;
    if (q && filterKeys?.length) {
      const needle = q.toLowerCase();
      out = out.filter((r) => filterKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(needle)));
    }
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }
    return out;
  }, [rows, q, filterKeys, sortKey, dir]);

  function toggleSort(key: string) {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setDir(1); }
  }

  return (
    <div>
      {filterKeys?.length ? (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter this page…"
          className="input mb-3"
          aria-label="Filter table"
        />
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2 font-black text-[var(--muted)]">
                  {c.sortable ? (
                    <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1" aria-label={`Sort by ${c.header}`}>
                      {c.header}
                      <span aria-hidden="true" className="text-[10px]">{sortKey === c.key ? (dir === 1 ? "▲" : "▼") : "↕"}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={getRowKey(r)} className="border-b border-[var(--border)]/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.className ?? ""}`}>{c.render ? c.render(r) : String(r[c.key] ?? "—")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {filtered.map((r) => (
          <div key={getRowKey(r)} className="rounded-xl border border-[var(--border)] p-3">
            {columns.map((c) => (
              <div key={c.key} className="flex justify-between gap-3 py-0.5 text-sm">
                <span className="font-bold text-[var(--muted)]">{c.header}</span>
                <span className="text-right">{c.render ? c.render(r) : String(r[c.key] ?? "—")}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {filtered.length === 0 && <p className="py-6 text-center text-sm text-[var(--muted)]">{emptyText}</p>}
    </div>
  );
}
