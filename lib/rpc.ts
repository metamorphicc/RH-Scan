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

export function getRpcConfigFromEnv(): RpcConfig {
  const rpcUrl = process.env.RH_RPC_URL?.trim();
  const rawChainId = process.env.RH_CHAIN_ID?.trim();

  if (!rpcUrl) {
    throw new RpcConfigError("RH_RPC_URL is required for Stage 1 RPC reads.");
  }

  if (!rawChainId) {
    throw new RpcConfigError("RH_CHAIN_ID is required for Stage 1 RPC reads.");
  }

  const chainId = Number.parseInt(rawChainId, 10);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new RpcConfigError("RH_CHAIN_ID must be a positive integer.");
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
