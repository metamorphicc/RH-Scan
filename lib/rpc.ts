export type RpcConfig = {
  rpcUrl: string;
  chainId: number;
};

export type RpcClient = {
  readonly config: RpcConfig;
};

export function createRpcClient(config: RpcConfig): RpcClient {
  // TODO Stage 1: create a read-only viem client for Robinhood Chain.
  return { config };
}

