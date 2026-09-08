import { parseAbi, type Abi, type Address } from "viem";
import { normalizeTokenAddress } from "./address";
import { createRpcClient, type RpcClient } from "./rpc";

export type FlagStatus = "present" | "absent" | "unknown";

export type TokenAuthorityFlags = {
  mint: FlagStatus;
  freeze: FlagStatus;
  owner: FlagStatus;
  feeWallet: FlagStatus;
  ownerAddress: Address | null;
  minterAddress: Address | null;
  freezeAuthorityAddress: Address | null;
  feeWalletAddress: Address | null;
};

export type RawRead<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

export type TokenMetadata = {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
};

export type TokenRightsDebug = {
  tokenAddress: Address;
  metadata: TokenMetadata;
  flags: TokenAuthorityFlags;
  raw: {
    owner: RawRead<Address>;
    getOwner: RawRead<Address>;
    minter: RawRead<Address>;
    mintingFinished: RawRead<boolean>;
    isMintingFinished: RawRead<boolean>;
    freezer: RawRead<Address>;
    blacklister: RawRead<Address>;
    pauser: RawRead<Address>;
    feeWallet: RawRead<Address>;
    taxWallet: RawRead<Address>;
    marketingWallet: RawRead<Address>;
    treasury: RawRead<Address>;
  };
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function readTokenAuthorityFlags(
  tokenAddress: string,
  client?: RpcClient,
): Promise<TokenAuthorityFlags> {
  const debug = await readTokenRightsDebug(tokenAddress, client);

  return debug.flags;
}

export async function readTokenRightsDebug(
  tokenAddress: string,
  client?: RpcClient,
): Promise<TokenRightsDebug> {
  const normalizedTokenAddress = normalizeTokenAddress(tokenAddress);
  const rpcClient = client ?? createRpcClient();
  const [
    name,
    symbol,
    decimals,
    owner,
    getOwner,
    minter,
    mintingFinished,
    isMintingFinished,
    freezer,
    blacklister,
    pauser,
    feeWallet,
    taxWallet,
    marketingWallet,
    treasury,
  ] = await Promise.all([
    readStringGetter(rpcClient, normalizedTokenAddress, "name"),
    readStringGetter(rpcClient, normalizedTokenAddress, "symbol"),
    readNumberGetter(rpcClient, normalizedTokenAddress, "decimals"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "owner"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "getOwner"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "minter"),
    readBooleanGetter(rpcClient, normalizedTokenAddress, "mintingFinished"),
    readBooleanGetter(rpcClient, normalizedTokenAddress, "isMintingFinished"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "freezer"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "blacklister"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "pauser"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "feeWallet"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "taxWallet"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "marketingWallet"),
    readAddressGetter(rpcClient, normalizedTokenAddress, "treasury"),
  ]);

  const ownerAddress = firstNonZeroAddress(owner, getOwner);
  const minterAddress = firstNonZeroAddress(minter);
  const freezeAuthorityAddress = firstNonZeroAddress(
    freezer,
    blacklister,
    pauser,
  );
  const feeWalletAddress = firstNonZeroAddress(
    feeWallet,
    taxWallet,
    marketingWallet,
    treasury,
  );

  return {
    tokenAddress: normalizedTokenAddress,
    metadata: {
      name: valueOrNull(name),
      symbol: valueOrNull(symbol),
      decimals: valueOrNull(decimals),
    },
    flags: {
      mint: mintStatus(minterAddress, mintingFinished, isMintingFinished),
      freeze: addressReadsStatus(freezeAuthorityAddress, freezer, blacklister, pauser),
      owner: addressReadsStatus(ownerAddress, owner, getOwner),
      feeWallet: addressReadsStatus(
        feeWalletAddress,
        feeWallet,
        taxWallet,
        marketingWallet,
        treasury,
      ),
      ownerAddress,
      minterAddress,
      freezeAuthorityAddress,
      feeWalletAddress,
    },
    raw: {
      owner,
      getOwner,
      minter,
      mintingFinished,
      isMintingFinished,
      freezer,
      blacklister,
      pauser,
      feeWallet,
      taxWallet,
      marketingWallet,
      treasury,
    },
  };
}

async function readAddressGetter(
  client: RpcClient,
  tokenAddress: Address,
  functionName: string,
): Promise<RawRead<Address>> {
  return readGetter<Address>(client, tokenAddress, functionName, "address");
}

async function readBooleanGetter(
  client: RpcClient,
  tokenAddress: Address,
  functionName: string,
): Promise<RawRead<boolean>> {
  return readGetter<boolean>(client, tokenAddress, functionName, "bool");
}

async function readNumberGetter(
  client: RpcClient,
  tokenAddress: Address,
  functionName: string,
): Promise<RawRead<number>> {
  return readGetter<number>(client, tokenAddress, functionName, "uint8");
}

async function readStringGetter(
  client: RpcClient,
  tokenAddress: Address,
  functionName: string,
): Promise<RawRead<string>> {
  return readGetter<string>(client, tokenAddress, functionName, "string");
}

async function readGetter<T>(
  client: RpcClient,
  tokenAddress: Address,
  functionName: string,
  returnType: "address" | "bool" | "string" | "uint8",
): Promise<RawRead<T>> {
  const abi = parseAbi([
    `function ${functionName}() view returns (${returnType})`,
  ]) as Abi;

  try {
    const value = await client.readContract({
      address: tokenAddress,
      abi,
      functionName,
    });

    return {
      ok: true,
      value: value as T,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown read error",
    };
  }
}

function valueOrNull<T>(read: RawRead<T>): T | null {
  return read.ok ? read.value : null;
}

function firstNonZeroAddress(
  ...reads: RawRead<Address>[]
): Address | null {
  for (const read of reads) {
    if (read.ok && read.value.toLowerCase() !== ZERO_ADDRESS) {
      return read.value;
    }
  }

  return null;
}

function addressReadsStatus(
  nonZeroAddress: Address | null,
  ...reads: RawRead<Address>[]
): FlagStatus {
  if (nonZeroAddress) {
    return "present";
  }

  if (reads.some((read) => !read.ok)) {
    return "unknown";
  }

  return "absent";
}

function mintStatus(
  minterAddress: Address | null,
  mintingFinished: RawRead<boolean>,
  isMintingFinished: RawRead<boolean>,
): FlagStatus {
  if (minterAddress) {
    return "present";
  }

  if (mintingFinished.ok) {
    return mintingFinished.value ? "absent" : "present";
  }

  if (isMintingFinished.ok) {
    return isMintingFinished.value ? "absent" : "present";
  }

  return "unknown";
}
