import { NextResponse } from "next/server";
import { AddressValidationError, normalizeTokenAddress } from "@/lib/address";
import { getSnapshotHistory } from "@/lib/db";
import { addSnapshotChanges } from "@/lib/history";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  }

  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  const limit = Number.parseInt(params.get("limit") ?? "20", 10);

  if (!token) {
    return NextResponse.json(
      {
        error: "Missing token query parameter.",
      },
      { status: 400, headers: rateLimitHeaders(rateLimit) },
    );
  }

  try {
    const normalizedToken = normalizeTokenAddress(token);
    const items = addSnapshotChanges(
      await getSnapshotHistory(
        normalizedToken,
        Number.isInteger(limit) ? limit : 20,
      ),
    );

    return NextResponse.json(
      {
        token: normalizedToken,
        count: items.length,
        items,
      },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    if (error instanceof AddressValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400, headers: rateLimitHeaders(rateLimit) },
      );
    }

    return NextResponse.json(
      {
        error: "History is unavailable right now.",
      },
      { status: 502, headers: rateLimitHeaders(rateLimit) },
    );
  }
}
