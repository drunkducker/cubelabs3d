import { NextResponse } from "next/server";
import { submitChallengeAttempt } from "@/app/lib/challenge-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await submitChallengeAttempt(params.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit challenge attempt.";
    const status = message === "Sign in required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
