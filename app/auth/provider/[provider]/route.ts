import { NextRequest, NextResponse } from "next/server";

const supportedProviders = new Set(["google", "github", "apple"]);

export function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider.toLowerCase();
  const destination = new URL("/auth/email", request.url);

  if (!supportedProviders.has(provider)) {
    destination.searchParams.set("error", "That sign-in provider is not supported.");
    return NextResponse.redirect(destination);
  }

  destination.searchParams.set(
    "message",
    `${provider[0].toUpperCase()}${provider.slice(1)} sign-in is prepared in the interface and will activate after that provider is enabled in Supabase. Continue with email for now.`,
  );
  return NextResponse.redirect(destination);
}
