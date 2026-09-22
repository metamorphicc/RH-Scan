import { ImageResponse } from "next/og";
import { normalizeTokenAddress } from "@/lib/address";
import { getLatestSnapshot } from "@/lib/db";
import type { Verdict } from "@/lib/rules";

export const runtime = "nodejs";

const SIZE = {
  width: 1200,
  height: 630,
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token") ?? "";
  const normalizedToken = normalizeForOg(token);
  const verdict = await verdictForOg(normalizedToken);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f6f7f4",
          color: "#131511",
          padding: "72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #d8ddd2",
              borderRadius: "16px",
              background: "#ffffff",
              color: "#1f7a53",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            rh
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#62685e", fontSize: "28px", fontWeight: 700 }}>
              rhcheck
            </span>
            <span style={{ color: "#62685e", fontSize: "24px" }}>
              Robinhood Chain token snapshot
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <span
            style={{
              color: "#1f7a53",
              fontSize: "30px",
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            verdict
          </span>
          <span
            style={{
              fontSize: "112px",
              fontWeight: 900,
              lineHeight: 0.95,
            }}
          >
            {verdict}
          </span>
          <span style={{ color: "#62685e", fontSize: "34px" }}>
            {shortAddress(normalizedToken)}
          </span>
        </div>

        <div style={{ color: "#62685e", fontSize: "24px" }}>
          Snapshot, not advice, not live tape.
        </div>
      </div>
    ),
    SIZE,
  );
}

async function verdictForOg(token: string): Promise<Verdict> {
  try {
    const normalizedToken = normalizeTokenAddress(token);
    const snapshot = await getLatestSnapshot(normalizedToken);

    return isVerdict(snapshot?.verdict) ? snapshot.verdict : "thin";
  } catch {
    return "thin";
  }
}

function isVerdict(value: unknown): value is Verdict {
  return value === "don't" || value === "thin" || value === "ok to size small";
}

function normalizeForOg(token: string): string {
  try {
    return normalizeTokenAddress(token);
  } catch {
    return token || "invalid token";
  }
}

function shortAddress(address: string): string {
  if (!address.startsWith("0x") || address.length < 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
