"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Verdict = "don't" | "thin" | "ok to size small";

type CheckResponse = {
  tokenAddress: string;
  verdict: Verdict;
  block: number;
  timestamp: string;
  facts: string[];
  cached: boolean;
  rights: {
    metadata: {
      name: string | null;
      symbol: string | null;
    };
  };
};

type LoadState =
  | {
      status: "loading";
    }
  | {
      status: "invalid" | "not-found" | "error";
      message: string;
    }
  | {
      status: "ready";
      result: CheckResponse;
    };

type TokenCheckPanelProps = {
  rawAddress: string;
};

export default function TokenCheckPanel({ rawAddress }: TokenCheckPanelProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const encodedAddress = useMemo(() => encodeURIComponent(rawAddress), [rawAddress]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCheck() {
      setState({ status: "loading" });

      try {
        const response = await fetch(`/api/check?token=${encodedAddress}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as Partial<CheckResponse> & {
          error?: string;
        };

        if (response.status === 400) {
          setState({
            status: "invalid",
            message: body.error ?? "Invalid token address.",
          });
          return;
        }

        if (response.status === 404) {
          setState({
            status: "not-found",
            message: body.error ?? "Token was not found.",
          });
          return;
        }

        if (!response.ok || !isCheckResponse(body)) {
          setState({
            status: "error",
            message: body.error ?? "Check is unavailable right now.",
          });
          return;
        }

        setState({
          status: "ready",
          result: body,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setState({
          status: "error",
          message: "Check is unavailable right now.",
        });
      }
    }

    loadCheck();

    return () => controller.abort();
  }, [encodedAddress]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy link"), 1400);
  }

  return (
    <section className="page result-page">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          rh
        </span>
        <span>rhcheck</span>
      </div>

      <div className="result-head">
        <div>
          <p className="eyebrow">Robinhood Chain</p>
          <h1>{state.status === "ready" ? state.result.verdict : statusTitle(state)}</h1>
        </div>
        <button className="secondary-button" type="button" onClick={copyLink}>
          {copyLabel}
        </button>
      </div>

      <div className="token-summary">
        <div>
          <span className="summary-label">Address</span>
          <span className="summary-value mono">{displayAddress(state, rawAddress)}</span>
        </div>
        <div>
          <span className="summary-label">Network</span>
          <span className="summary-value">Robinhood Chain</span>
        </div>
        <div>
          <span className="summary-label">Name</span>
          <span className="summary-value">{displayName(state)}</span>
        </div>
      </div>

      {state.status === "loading" ? <LoadingState rawAddress={rawAddress} /> : null}
      {state.status === "invalid" || state.status === "not-found" || state.status === "error" ? (
        <MessageState state={state} rawAddress={rawAddress} />
      ) : null}
      {state.status === "ready" ? <ReadyState result={state.result} /> : null}

      <p className="disclaimer">Snapshot, not advice, not live tape.</p>

      <Link className="back-link" href="/">
        Back
      </Link>
    </section>
  );
}

function LoadingState({ rawAddress }: { rawAddress: string }) {
  return (
    <div className="status-panel" role="status">
      <h2>Checking token...</h2>
      <p className="mono">{rawAddress}</p>
    </div>
  );
}

function MessageState({
  state,
  rawAddress,
}: {
  state: Extract<LoadState, { status: "invalid" | "not-found" | "error" }>;
  rawAddress: string;
}) {
  return (
    <div className="status-panel" role="status">
      <h2>{statusTitle(state)}</h2>
      <p>{state.message}</p>
      <p className="mono">{rawAddress}</p>
    </div>
  );
}

function ReadyState({ result }: { result: CheckResponse }) {
  const facts = result.facts.slice(0, 3);

  return (
    <>
      <div className={`verdict-panel verdict-${verdictClass(result.verdict)}`}>
        <span className="summary-label">Verdict</span>
        <strong>{result.verdict}</strong>
      </div>

      <div className="facts-list" aria-label="Token facts">
        {facts.map((fact) => (
          <div className="fact-row" key={fact}>
            {fact}
          </div>
        ))}
      </div>

      <div className="snapshot-meta">
        <div>
          <span className="summary-label">Block</span>
          <span className="summary-value">{result.block}</span>
        </div>
        <div>
          <span className="summary-label">Snapshot UTC</span>
          <span className="summary-value">{formatUtc(result.timestamp)}</span>
        </div>
        <div>
          <span className="summary-label">Cache</span>
          <span className="summary-value">{result.cached ? "hit" : "fresh"}</span>
        </div>
      </div>
    </>
  );
}

function isCheckResponse(value: Partial<CheckResponse>): value is CheckResponse {
  return (
    typeof value.tokenAddress === "string" &&
    typeof value.verdict === "string" &&
    typeof value.block === "number" &&
    typeof value.timestamp === "string" &&
    Array.isArray(value.facts)
  );
}

function statusTitle(state: LoadState): string {
  switch (state.status) {
    case "loading":
      return "checking";
    case "invalid":
      return "invalid";
    case "not-found":
      return "not found";
    case "error":
      return "not wired";
    case "ready":
      return state.result.verdict;
  }
}

function displayAddress(state: LoadState, fallback: string): string {
  return state.status === "ready" ? state.result.tokenAddress : fallback;
}

function displayName(state: LoadState): string {
  if (state.status !== "ready") {
    return "unknown";
  }

  const { name, symbol } = state.result.rights.metadata;

  if (name && symbol) {
    return `${name} (${symbol})`;
  }

  return name ?? symbol ?? "unknown";
}

function verdictClass(verdict: Verdict): string {
  if (verdict === "don't") {
    return "dont";
  }

  if (verdict === "thin") {
    return "thin";
  }

  return "ok";
}

function formatUtc(timestamp: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}
