import Link from "next/link";

type TokenPageProps = {
  params: Promise<{
    address: string;
  }>;
};

export default async function TokenPage({ params }: TokenPageProps) {
  const { address } = await params;
  const rawAddress = decodeURIComponent(address);

  return (
    <section className="page">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          rh
        </span>
        <span>rhcheck</span>
      </div>

      <p className="eyebrow">Token placeholder</p>
      <h1>not wired</h1>

      <div className="placeholder" role="status">
        <h2>Read-only check is not connected yet.</h2>
        <p>
          This page intentionally makes no RPC calls and shows no verdict until
          later stages implement the check pipeline.
        </p>
      </div>

      <div className="raw-address" aria-label="Raw token address">
        {rawAddress}
      </div>

      <Link className="back-link" href="/">
        Back
      </Link>
    </section>
  );
}

