import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";
import { saveSolveResult } from "@/app/lib/challenge-service";

type AuthUser = { id: string };
type SolvePayload = {
  puzzle_type?: string;
  scramble?: string;
  solve_time_ms?: number | null;
  move_count?: number | null;
  solved?: boolean;
  is_dnf?: boolean;
  replay_data?: unknown;
};

export async function POST(request: Request) {
  const token = getAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
    const body = (await request.json()) as SolvePayload;

    if (!body.puzzle_type || !body.scramble) {
      return NextResponse.json({ error: "puzzle_type and scramble are required." }, { status: 400 });
    }

    const saved = await saveSolveResult(token, user.id, body);

    return NextResponse.json({ id: saved.solveId, scramble_id: saved.scrambleId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save solve.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
