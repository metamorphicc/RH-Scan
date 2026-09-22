import { NextResponse } from "next/server";
import { AddressValidationError, normalizeTokenAddress } from "@/lib/address";
import { getSnapshotHistory } from "@/lib/db";
import { addSnapshotChanges } from "@/lib/history";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  const limit = Number.parseInt(params.get("limit") ?? "20", 10);

  if (!token) {
    return NextResponse.json(
      {
        error: "Missing token query parameter.",
      },
      { status: 400 },
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

    return NextResponse.json({
      token: normalizedToken,
      count: items.length,
      items,
    });
  } catch (error) {
    if (error instanceof AddressValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "History is unavailable right now.",
      },
      { status: 502 },
    );
  }
}
