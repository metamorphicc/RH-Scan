const DEFAULT_ASSETS_API_URL = "https://api.robinhood.com/rhj/assets";
const ASSETS_CACHE_MS = 5 * 60_000;
const ASSETS_TIMEOUT_MS = 5_000;

type Address = `0x${string}`;

type AssetDeployment = {
  contractAddress: Address;
  chainId: number;
};

type AssetRecord = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  deployments: AssetDeployment[];
  currentMultiplier: string | null;
  pendingMultiplier: string | null;
  pendingMultiplierEffectiveTime: string | null;
  logoUrl: string | null;
  status: string | null;
  tradingCapabilities: Record<string, unknown> | null;
};

export type RobinhoodAssetIdentity = {
  status: "canonical" | "not-listed" | "unavailable";
  asset: AssetRecord | null;
  sourceUrl: string;
  observedAt: string;
  error: string | null;
};

type AssetsResponse = {
  assets?: unknown;
};

let assetsCache:
  | {
      expiresAt: number;
      assets: AssetRecord[];
    }
  | undefined;

export async function readRobinhoodAssetIdentity(
  address: Address,
  options: {
    fetcher?: typeof fetch;
    apiUrl?: string;
    chainId?: number;
    now?: () => number;
  } = {},
): Promise<RobinhoodAssetIdentity> {
  const apiUrl = (options.apiUrl?.trim() || process.env.RH_ASSETS_API_URL?.trim() || DEFAULT_ASSETS_API_URL).replace(/\/+$/, "");
  const chainId = options.chainId ?? 4663;
  const now = options.now ?? Date.now;
  const observedAt = new Date(now()).toISOString();

  try {
    const assets = await readAssets(apiUrl, options.fetcher ?? fetch, now);
    const asset = assets.find((candidate) =>
      candidate.deployments.some(
        (deployment) =>
          deployment.chainId === chainId &&
          deployment.contractAddress.toLowerCase() === address.toLowerCase(),
      ),
    );

    return {
      status: asset ? "canonical" : "not-listed",
      asset: asset ?? null,
      sourceUrl: apiUrl,
      observedAt,
      error: null,
    };
  } catch {
    return {
      status: "unavailable",
      asset: null,
      sourceUrl: apiUrl,
      observedAt,
      error: "Robinhood asset registry request failed.",
    };
  }
}

async function readAssets(
  apiUrl: string,
  fetcher: typeof fetch,
  now: () => number,
): Promise<AssetRecord[]> {
  const timestamp = now();

  if (assetsCache && assetsCache.expiresAt > timestamp) {
    return assetsCache.assets;
  }

  const response = await fetcher(apiUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(ASSETS_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Robinhood asset registry returned ${response.status}.`);
  }

  const payload = (await response.json()) as AssetsResponse;
  const assets = Array.isArray(payload.assets)
    ? payload.assets.flatMap((value) => {
        const asset = parseAsset(value);
        return asset ? [asset] : [];
      })
    : [];

  assetsCache = {
    assets,
    expiresAt: timestamp + ASSETS_CACHE_MS,
  };
  return assets;
}

function parseAsset(value: unknown): AssetRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const deployments = Array.isArray(value.deployments)
    ? value.deployments.flatMap((deployment) => {
        if (!isRecord(deployment)) {
          return [];
        }

        const contractAddress = asAddress(deployment.contractAddress);
        const chainId = deployment.chainId;
        return contractAddress && typeof chainId === "number"
          ? [{ contractAddress, chainId }]
          : [];
      })
    : [];

  if (
    typeof value.id !== "string" ||
    typeof value.tokenSymbol !== "string" ||
    typeof value.tokenName !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    tokenSymbol: value.tokenSymbol,
    tokenName: value.tokenName,
    deployments,
    currentMultiplier: asOptionalString(value.currentMultiplier),
    pendingMultiplier: asOptionalString(value.pendingMultiplier),
    pendingMultiplierEffectiveTime: asOptionalString(
      value.pendingMultiplierEffectiveTime,
    ),
    logoUrl: asHttpUrl(value.logoUrl),
    status: asOptionalString(value.status),
    tradingCapabilities: isRecord(value.tradingCapabilities)
      ? value.tradingCapabilities
      : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asAddress(value: unknown): Address | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function clearRobinhoodAssetsCacheForTests(): void {
  assetsCache = undefined;
}
