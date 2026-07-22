import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

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
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
    const body = (await request.json()) as SolvePayload;

    if (!body.puzzle_type || !body.scramble) {
      return NextResponse.json({ error: "puzzle_type and scramble are required." }, { status: 400 });
    }

    const rows = await supabaseRequest<Array<{ id: string }>>(
      "/rest/v1/solve_results?select=id",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          puzzle_type: body.puzzle_type,
          scramble: body.scramble,
          solve_time_ms: body.solve_time_ms ?? null,
          move_count: body.move_count ?? null,
          solved: body.solved ?? false,
          is_dnf: body.is_dnf ?? false,
          replay_data: body.replay_data ?? null,
        }),
      },
      token,
    );

    return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save solve.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
