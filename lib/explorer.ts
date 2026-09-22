const DEFAULT_EXPLORER_API_URL =
  "https://robinhoodchain.blockscout.com/api/v2";
const EXPLORER_TIMEOUT_MS = 5_000;

type Address = `0x${string}`;
type Hash = `0x${string}`;

export type ExplorerContractInfo = {
  status: "available" | "unavailable";
  address: Address;
  creatorAddress: Address | null;
  creationTransactionHash: Hash | null;
  isContract: boolean | null;
  isVerified: boolean | null;
  proxyType: string | null;
  implementationAddress: Address | null;
  explorerUrl: string;
  error: string | null;
};

type BlockscoutAddressResponse = {
  creator_address_hash?: unknown;
  creation_transaction_hash?: unknown;
  is_contract?: unknown;
  is_verified?: unknown;
  proxy_type?: unknown;
  implementations?: unknown;
};

export async function readExplorerContractInfo(
  address: Address,
  options: {
    fetcher?: typeof fetch;
    apiUrl?: string;
  } = {},
): Promise<ExplorerContractInfo> {
  const apiUrl = normalizeApiUrl(
    options.apiUrl ?? process.env.RH_EXPLORER_API_URL,
  );
  const explorerUrl = `${publicExplorerUrl(apiUrl)}/address/${address}`;

  try {
    const response = await (options.fetcher ?? fetch)(
      `${apiUrl}/addresses/${address}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(EXPLORER_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      return unavailable(address, explorerUrl, `Explorer returned ${response.status}.`);
    }

    const payload = (await response.json()) as BlockscoutAddressResponse;
    const implementations = Array.isArray(payload.implementations)
      ? payload.implementations
      : [];
    const firstImplementation = implementations[0] as
      | { address_hash?: unknown }
      | undefined;

    return {
      status: "available",
      address,
      creatorAddress: asAddress(payload.creator_address_hash),
      creationTransactionHash: asHash(payload.creation_transaction_hash),
      isContract:
        typeof payload.is_contract === "boolean" ? payload.is_contract : null,
      isVerified:
        typeof payload.is_verified === "boolean" ? payload.is_verified : null,
      proxyType: typeof payload.proxy_type === "string" ? payload.proxy_type : null,
      implementationAddress: asAddress(firstImplementation?.address_hash),
      explorerUrl,
      error: null,
    };
  } catch {
    return unavailable(address, explorerUrl, "Explorer request failed.");
  }
}

function normalizeApiUrl(value: string | undefined): string {
  return (value?.trim() || DEFAULT_EXPLORER_API_URL).replace(/\/+$/, "");
}

function publicExplorerUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/v2\/?$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "https://robinhoodchain.blockscout.com";
  }
}

function asAddress(value: unknown): Address | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : null;
}

function asHash(value: unknown): Hash | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)
    ? (value as Hash)
    : null;
}

function unavailable(
  address: Address,
  explorerUrl: string,
  error: string,
): ExplorerContractInfo {
  return {
    status: "unavailable",
    address,
    creatorAddress: null,
    creationTransactionHash: null,
    isContract: null,
    isVerified: null,
    proxyType: null,
    implementationAddress: null,
    explorerUrl,
    error,
  };
}
