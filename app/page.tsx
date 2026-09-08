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
    <section className="page">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          rh
        </span>
        <span>rhcheck</span>
      </div>

      <p className="eyebrow">Robinhood Chain token check</p>
      <h1>Read-only token facts, before the wiring exists.</h1>
      <p className="lede">
        Paste a token address to open its placeholder check page. This stage
        does not connect a wallet, send transactions, call RPC, score with an
        LLM, or offer a buy path.
      </p>

      <form className="address-form" onSubmit={handleSubmit}>
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
          placeholder="0x..."
          spellCheck={false}
          value={address}
        />
        <button className="submit-button" type="submit">
          Check
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
