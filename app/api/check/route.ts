import { NextResponse } from "next/server";
import { AddressValidationError } from "@/lib/address";
import { checkToken } from "@/lib/check";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { RpcConfigError } from "@/lib/rpc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many checks. Try again shortly.",
      },
      {
        status: 429,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }

  const params = new URL(request.url).searchParams;
  const token = params.get("token");
  const deployer = params.get("deployer");

  if (!token) {
    return NextResponse.json(
      {
        error: "Missing token query parameter.",
      },
      {
        status: 400,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }

  try {
    const result = await checkToken(token, {
      deployerAddress: deployer,
    });

    return NextResponse.json(result, {
      headers: rateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (error instanceof AddressValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 400,
          headers: rateLimitHeaders(rateLimit),
        },
      );
    }

    if (error instanceof RpcConfigError) {
      return NextResponse.json(
        {
          error: "Check is unavailable right now.",
        },
        {
          status: 503,
          headers: rateLimitHeaders(rateLimit),
        },
      );
    }

    return NextResponse.json(
      {
        error: "Check is unavailable right now.",
      },
      {
        status: 502,
        headers: rateLimitHeaders(rateLimit),
      },
    );
  }
}
