import "server-only";

import { adminRequest } from "./service-client";

/*
 * Small bounded list helper for admin tables. Always paginated; callers pass a
 * PostgREST query. Never used to dump an entire table to the browser.
 */
export async function listRows<T>(path: string, page = 0, pageSize = 25): Promise<T[]> {
  const size = Math.min(100, Math.max(1, pageSize));
  const from = Math.max(0, page) * size;
  const to = from + size - 1;
  try {
    const rows = await adminRequest<T[]>(path, { headers: { Range: `${from}-${to}` } });
    return rows ?? [];
  } catch {
    return [];
  }
}
