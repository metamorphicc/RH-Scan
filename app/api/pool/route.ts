import { NextResponse } from "next/server";
import { AddressValidationError } from "@/lib/address";
import { readPoolFacts } from "@/lib/pool";
import { RpcConfigError } from "@/lib/rpc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  const deployer = params.get("deployer");

  if (!token) {
    return NextResponse.json(
      {
        error: "Missing token query parameter.",
      },
      { status: 400 },
    );
  }

  try {
    const pool = await readPoolFacts(token, {
      deployerAddress: deployer,
    });

    return NextResponse.json(pool);
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
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown pool read error.",
      },
      { status: 502 },
    );
  }
}

