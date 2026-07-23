import { NextResponse } from "next/server";
import { createChallengeForRecipient } from "@/app/lib/challenge-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const challenge = await createChallengeForRecipient(body);
    return NextResponse.json(challenge, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create challenge.";
    const status = message === "Sign in required." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
