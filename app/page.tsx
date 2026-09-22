"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeTokenAddress } from "@/lib/address";

export default function HomePage() {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedAddress = address.trim();

    if (trimmedAddress.length === 0) {
      setError("Enter a token address.");
      return;
    }

    try {
      const normalizedAddress = normalizeTokenAddress(trimmedAddress);
      setError(null);
      router.push(`/t/${encodeURIComponent(normalizedAddress)}`);
    } catch {
      setError("Enter a valid 0x EVM address.");
    }
  }

  return (
    <div className="home-shell">
      <section className="hero-console">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            rh
          </span>
          <span>rhcheck</span>
        </div>

        <div className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Robinhood Chain / 4663 / read only</p>
            <h1>RHCHECK</h1>
            <p className="lede">
              Paste a token contract. rhcheck takes one live snapshot, applies
              plain rules, stores the result, and refuses every transaction
              path.
            </p>

            <form className="scan-card" onSubmit={handleSubmit}>
              <div className="scan-card-top">
                <span>public scan</span>
                <span>no signer</span>
              </div>
              <div className="address-form">
                <label className="sr-only" htmlFor="token-address">
                  Token address
                </label>
                <input
                  id="token-address"
                  className="address-input"
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  inputMode="text"
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="0x... token contract"
                  spellCheck={false}
                  value={address}
                />
                <button className="submit-button" type="submit">
                  CHECK TOKEN
                </button>
              </div>
              {error ? <p className="form-error">{error}</p> : null}
              <p className="scan-foot">
                One snapshot. Nothing is signed, bought, sold, or routed.
              </p>
            </form>
          </div>

          <div className="signal-board" aria-label="rhcheck system surface">
            <div className="signal-board-top">
              <span>snapshot surface</span>
              <span>live rpc</span>
            </div>
            <div className="signal-row">
              <span>rights</span>
              <b>mint / freeze / owner / fees</b>
            </div>
            <div className="signal-row">
              <span>pool</span>
              <b>venue / reserves / deployer share</b>
            </div>
            <div className="signal-row">
              <span>deployer</span>
              <b>local history / dead count</b>
            </div>
            <div className="signal-row">
              <span>memory</span>
              <b>snapshots persist in sqlite</b>
            </div>
          </div>
        </div>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            <span>NO WALLET</span>
            <span>NO SIGNER</span>
            <span>NO BUY BUTTON</span>
            <span>NO LLM SCORE</span>
            <span>UNKNOWN IS NOT OK</span>
            <span>SNAPSHOT ONLY</span>
            <span>NO WALLET</span>
            <span>NO SIGNER</span>
            <span>NO BUY BUTTON</span>
            <span>NO LLM SCORE</span>
            <span>UNKNOWN IS NOT OK</span>
            <span>SNAPSHOT ONLY</span>
          </div>
        </div>
      </section>

      <section className="story-section">
        <div className="story-head">
          <p className="eyebrow">one check / three facts</p>
          <h2>Small surface, hard boundary.</h2>
          <p>
            rhcheck is built for the moment before you chase a contract. It
            does not promise outcomes. It reads what it can, names what it
            cannot, and keeps unknowns from turning into comfort.
          </p>
        </div>

        <div className="coverage-grid">
          <InfoCard title="01 / rights" body="Known ABI reads for owner, mint, freeze, and fee-like controls." />
          <InfoCard title="02 / pool" body="Pool discovery is wired, but venues stay empty until addresses are verified." />
          <InfoCard title="03 / deployer" body="Local history counts snapshots and dead-token signals over time." />
          <InfoCard title="04 / memory" body="Every check writes a snapshot that history can read back later." />
        </div>
      </section>

      <section className="refusal-section">
        <div>
          <p className="eyebrow">trust boundary</p>
          <h2>Useful because some paths do not exist.</h2>
        </div>
        <div className="refusal-list">
          <div>
            <b>sign transaction</b>
            <span>refused: no wallet client and no signer path</span>
          </div>
          <div>
            <b>buy token</b>
            <span>refused: verdicts are context, not orders</span>
          </div>
          <div>
            <b>invent confidence</b>
            <span>refused: every flag maps to a plain rule</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="info-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
