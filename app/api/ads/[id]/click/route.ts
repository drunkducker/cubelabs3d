import { NextRequest, NextResponse } from "next/server";
import { getData } from "@/app/lib/data";

/*
 * Ad click tracker + redirect. Increments the ad's click counter, then sends
 * the visitor to the ad's OWN destination_url (never a user-supplied URL, so
 * this cannot be used as an open redirect). Falls back to home if the ad is
 * missing or its destination is not a valid http(s) URL.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const data = getData();

  let destination: string | null = null;
  try {
    const ad = await data.ads.publicById(params.id);
    destination = ad?.destination_url ?? null;
  } catch {
    destination = null;
  }

  try {
    await data.ads.trackEvent(params.id, "click");
  } catch {
    // Tracking is best-effort; never block the redirect.
  }

  if (destination && /^https?:\/\//i.test(destination)) {
    return NextResponse.redirect(destination);
  }
  return NextResponse.redirect(new URL("/", _req.url));
}
