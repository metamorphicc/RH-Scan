import TokenCheckPanel from "./token-check-panel";

type TokenPageProps = {
  params: Promise<{
    address: string;
  }>;
};

export default async function TokenPage({ params }: TokenPageProps) {
  const { address } = await params;
  const rawAddress = decodeURIComponent(address);

  return <TokenCheckPanel rawAddress={rawAddress} />;
}
