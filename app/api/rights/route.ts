import { NextResponse } from "next/server";
import { AddressValidationError } from "@/lib/address";
import { readTokenRightsDebug } from "@/lib/flags";
import { RpcConfigError } from "@/lib/rpc";
import { debugApiEnabled } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!debugApiEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      {
        error: "Missing token query parameter.",
      },
      { status: 400 },
    );
  }

  try {
    const rights = await readTokenRightsDebug(token);

    return NextResponse.json(rights);
  } catch (error) {
    if (error instanceof AddressValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    if (error instanceof RpcConfigError) {
      return NextResponse.json(
        {
          error: "Rights check is unavailable right now.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: "Rights check is unavailable right now.",
      },
      { status: 502 },
    );
  }
}
