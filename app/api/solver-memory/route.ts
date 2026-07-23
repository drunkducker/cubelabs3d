import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "@/app/lib/supabase-rest";

type AuthUser = { id: string };

type SolverMemoryPayload = {
  puzzle_type?: string;
  title?: string;
  scramble_id?: string | null;
  scramble?: string | null;
  cube_state?: unknown;
  solution_steps?: unknown;
  solution_summary?: string | null;
  solver_name?: string | null;
  move_count?: number | null;
  solve_time_ms?: number | null;
  source?: string;
  is_favorite?: boolean;
  metadata?: unknown;
};

function requirePuzzleType(value: unknown) {
  if (typeof value !== "string" || value.trim().length < 2) {
    throw new Error("puzzle_type is required.");
  }
  return value.trim();
}

function requireCubeState(value: unknown) {
  if (value === null || value === undefined) {
    throw new Error("cube_state is required.");
  }
  return value;
}

function safeSource(value: unknown) {
  if (value === "manual" || value === "camera" || value === "challenge" || value === "play" || value === "import") {
    return value;
  }
  return "solver";
}

export async function GET(request: Request) {
  const token = getAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
    const url = new URL(request.url);
    const puzzleType = url.searchParams.get("puzzle_type");
    const params = new URLSearchParams();
    params.set("user_id", `eq.${user.id}`);
    params.set("select", "id,puzzle_type,title,scramble_id,scramble,cube_state,solution_steps,solution_summary,solver_name,move_count,solve_time_ms,source,memory_tier,is_favorite,created_at,updated_at");
    params.set("order", "created_at.desc");
    params.set("limit", "30");
    if (puzzleType) params.set("puzzle_type", `eq.${puzzleType}`);

    const rows = await supabaseRequest(`/rest/v1/solver_memories?${params.toString()}`, {}, token);
    return NextResponse.json({ memories: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load solver memories.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const token = getAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const user = await supabaseRequest<AuthUser>("/auth/v1/user", {}, token);
    const body = (await request.json()) as SolverMemoryPayload;
    const puzzleType = requirePuzzleType(body.puzzle_type);
    const cubeState = requireCubeState(body.cube_state);

    /*
     * Paid-tier enforcement will come from account/app metadata after payments
     * land. Until then, writes are signed-in only and marked as signed_in memory.
     */
    const rows = await supabaseRequest<Array<{ id: string }>>(
      "/rest/v1/solver_memories?select=id",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          puzzle_type: puzzleType,
          title: body.title?.slice(0, 80) ?? null,
          scramble_id: body.scramble_id ?? null,
          scramble: body.scramble ?? null,
          cube_state: cubeState,
          solution_steps: Array.isArray(body.solution_steps) ? body.solution_steps : [],
          solution_summary: body.solution_summary ?? null,
          solver_name: body.solver_name ?? null,
          move_count: body.move_count ?? null,
          solve_time_ms: body.solve_time_ms ?? null,
          source: safeSource(body.source),
          memory_tier: "signed_in",
          is_favorite: body.is_favorite ?? false,
          metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
        }),
      },
      token,
    );

    return NextResponse.json({ id: rows[0]?.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save solver memory.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
