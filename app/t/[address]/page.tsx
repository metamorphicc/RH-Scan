import type { Metadata } from "next";
import TokenCheckPanel from "./token-check-panel";

type TokenPageProps = {
  params: Promise<{
    address: string;
  }>;
};

export async function generateMetadata({
  params,
}: TokenPageProps): Promise<Metadata> {
  const { address } = await params;
  const rawAddress = decodeURIComponent(address);
  const short = shortAddress(rawAddress);
  const imageUrl = `/api/og?token=${encodeURIComponent(rawAddress)}`;
  const title = `rhcheck ${short}`;
  const description = "Read-only Robinhood Chain token snapshot.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function TokenPage({ params }: TokenPageProps) {
  const { address } = await params;
  const rawAddress = decodeURIComponent(address);

  return <TokenCheckPanel rawAddress={rawAddress} />;
}

function shortAddress(address: string): string {
  if (!address.startsWith("0x") || address.length < 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
