import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { getRpcConfigFromEnv } from "@/lib/rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  let rpcConfigured = false;

  try {
    getRpcConfigFromEnv();
    rpcConfigured = true;
  } catch {
    rpcConfigured = false;
  }

  const database = checkDatabaseHealth();
  const ok = database && rpcConfigured;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      database,
      rpcConfigured,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
