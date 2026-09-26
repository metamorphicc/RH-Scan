import {
  createPublicClient,
  http,
  type Chain,
  type PublicClient,
  type Transport,
} from "viem";

export class RpcConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RpcConfigError";
  }
}

export type RpcConfig = {
  rpcUrl: string;
  chainId: number;
};

export type RpcClient = PublicClient<Transport, Chain>;

export const DEFAULT_RH_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const DEFAULT_RH_CHAIN_ID = 4663;

export function getRpcConfigFromEnv(): RpcConfig {
  const rpcUrl = process.env.RH_RPC_URL?.trim() || DEFAULT_RH_RPC_URL;
  const rawChainId =
    process.env.RH_CHAIN_ID?.trim() || String(DEFAULT_RH_CHAIN_ID);

  const chainId = Number.parseInt(rawChainId, 10);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new RpcConfigError("RH_CHAIN_ID must be a positive integer.");
  }

  let parsedRpcUrl: URL;

  try {
    parsedRpcUrl = new URL(rpcUrl);
  } catch {
    throw new RpcConfigError("RH_RPC_URL must be a valid HTTPS URL.");
  }

  if (parsedRpcUrl.protocol !== "https:" && parsedRpcUrl.hostname !== "localhost" && parsedRpcUrl.hostname !== "127.0.0.1") {
    throw new RpcConfigError("RH_RPC_URL must use HTTPS outside local development.");
  }

  return {
    rpcUrl,
    chainId,
  };
}

export function createRpcClient(config = getRpcConfigFromEnv()): RpcClient {
  const robinhoodChain = {
    id: config.chainId,
    name: "Robinhood Chain",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [config.rpcUrl],
      },
    },
  } satisfies Chain;

  return createPublicClient({
    chain: robinhoodChain,
    transport: http(config.rpcUrl, {
      retryCount: 2,
      retryDelay: 300,
      timeout: 10_000,
    }),
  });
}
