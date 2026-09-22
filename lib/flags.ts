import { parseAbi, type Abi, type Address, type Hex } from "viem";
import { normalizeTokenAddress } from "./address";
import { createRpcClient, type RpcClient } from "./rpc";

export type FlagStatus = "present" | "absent" | "unknown";

export type TokenAuthorityFlags = {
  mint: FlagStatus;
  freeze: FlagStatus;
  owner: FlagStatus;
  feeWallet: FlagStatus;
  paused: boolean | null;
  ownerAddress: Address | null;
  pendingOwnerAddress: Address | null;
  minterAddress: Address | null;
  freezeAuthorityAddress: Address | null;
  feeWalletAddress: Address | null;
};

export type RawRead<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type TokenMetadata = {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
};

export type ProxyInfo = {
  type: "eip1967" | "beacon" | "none" | "unknown";
  implementationAddress: Address | null;
  beaconAddress: Address | null;
};

export type RoleInfo = {
  status: FlagStatus;
  roleId: Hex | null;
  memberAddress: Address | null;
};

export type TokenRightsDebug = {
  tokenAddress: Address;
  metadata: TokenMetadata;
  proxy: ProxyInfo;
  roles: {
    minter: RoleInfo;
    pauser: RoleInfo;
    blacklister: RoleInfo;
    freezer: RoleInfo;
  };
  flags: TokenAuthorityFlags;
  raw: {
    owner: RawRead<Address>;
    getOwner: RawRead<Address>;
    pendingOwner: RawRead<Address>;
    minter: RawRead<Address>;
    mintingFinished: RawRead<boolean>;
    isMintingFinished: RawRead<boolean>;
    paused: RawRead<boolean>;
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
const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

export async function readTokenAuthorityFlags(
  tokenAddress: string,
  client?: RpcClient,
): Promise<TokenAuthorityFlags> {
  return (await readTokenRightsDebug(tokenAddress, client)).flags;
}

export async function readTokenRightsDebug(
  tokenAddress: string,
  client?: RpcClient,
): Promise<TokenRightsDebug> {
  const token = normalizeTokenAddress(tokenAddress);
  const rpcClient = client ?? createRpcClient();
  const [
    name,
    symbol,
    decimals,
    owner,
    getOwner,
    pendingOwner,
    minter,
    mintingFinished,
    isMintingFinished,
    paused,
    freezer,
    blacklister,
    pauser,
    feeWallet,
    taxWallet,
    marketingWallet,
    treasury,
    proxy,
    minterRole,
    pauserRole,
    blacklisterRole,
    freezerRole,
  ] = await Promise.all([
    readStringGetter(rpcClient, token, "name"),
    readStringGetter(rpcClient, token, "symbol"),
    readNumberGetter(rpcClient, token, "decimals"),
    readAddressGetter(rpcClient, token, "owner"),
    readAddressGetter(rpcClient, token, "getOwner"),
    readAddressGetter(rpcClient, token, "pendingOwner"),
    readAddressGetter(rpcClient, token, "minter"),
    readBooleanGetter(rpcClient, token, "mintingFinished"),
    readBooleanGetter(rpcClient, token, "isMintingFinished"),
    readBooleanGetter(rpcClient, token, "paused"),
    readAddressGetter(rpcClient, token, "freezer"),
    readAddressGetter(rpcClient, token, "blacklister"),
    readAddressGetter(rpcClient, token, "pauser"),
    readAddressGetter(rpcClient, token, "feeWallet"),
    readAddressGetter(rpcClient, token, "taxWallet"),
    readAddressGetter(rpcClient, token, "marketingWallet"),
    readAddressGetter(rpcClient, token, "treasury"),
    resolveProxy(rpcClient, token),
    readRole(rpcClient, token, "MINTER_ROLE"),
    readRole(rpcClient, token, "PAUSER_ROLE"),
    readRole(rpcClient, token, "BLACKLISTER_ROLE"),
    readRole(rpcClient, token, "FREEZER_ROLE"),
  ]);

  const ownerAddress = firstNonZeroAddress(owner, getOwner);
  const pendingOwnerAddress = firstNonZeroAddress(pendingOwner);
  const minterAddress =
    firstNonZeroAddress(minter) ?? minterRole.memberAddress;
  const freezeAuthorityAddress =
    firstNonZeroAddress(freezer, blacklister, pauser) ??
    firstRoleMember(pauserRole, blacklisterRole, freezerRole);
  const feeWalletAddress = firstNonZeroAddress(
    feeWallet,
    taxWallet,
    marketingWallet,
    treasury,
  );

  return {
    tokenAddress: token,
    metadata: {
      name: valueOrNull(name),
      symbol: valueOrNull(symbol),
      decimals: valueOrNull(decimals),
    },
    proxy,
    roles: {
      minter: minterRole,
      pauser: pauserRole,
      blacklister: blacklisterRole,
      freezer: freezerRole,
    },
    flags: {
      mint: mintStatus(
        minterAddress,
        minterRole,
        mintingFinished,
        isMintingFinished,
      ),
      freeze: freezeStatus(
        freezeAuthorityAddress,
        paused,
        [pauserRole, blacklisterRole, freezerRole],
        freezer,
        blacklister,
        pauser,
      ),
      owner: addressReadsStatus(
        ownerAddress ?? pendingOwnerAddress,
        owner,
        getOwner,
        pendingOwner,
      ),
      feeWallet: addressReadsStatus(
        feeWalletAddress,
        feeWallet,
        taxWallet,
        marketingWallet,
        treasury,
      ),
      paused: paused.ok ? paused.value : null,
      ownerAddress,
      pendingOwnerAddress,
      minterAddress,
      freezeAuthorityAddress,
      feeWalletAddress,
    },
    raw: {
      owner,
      getOwner,
      pendingOwner,
      minter,
      mintingFinished,
      isMintingFinished,
      paused,
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

async function readRole(
  client: RpcClient,
  token: Address,
  roleGetter: string,
): Promise<RoleInfo> {
  const role = await readGetter<Hex>(client, token, roleGetter, "bytes32");

  if (!role.ok) {
    return { status: "unknown", roleId: null, memberAddress: null };
  }

  try {
    const count = await client.readContract({
      address: token,
      abi: ACCESS_CONTROL_ABI,
      functionName: "getRoleMemberCount",
      args: [role.value],
    });

    if (count === 0n) {
      return { status: "absent", roleId: role.value, memberAddress: null };
    }

    const memberAddress = await client.readContract({
      address: token,
      abi: ACCESS_CONTROL_ABI,
      functionName: "getRoleMember",
      args: [role.value, 0n],
    });

    return {
      status: isZeroAddress(memberAddress) ? "absent" : "present",
      roleId: role.value,
      memberAddress: isZeroAddress(memberAddress) ? null : memberAddress,
    };
  } catch {
    return { status: "unknown", roleId: role.value, memberAddress: null };
  }
}

async function resolveProxy(
  client: RpcClient,
  token: Address,
): Promise<ProxyInfo> {
  try {
    const [implementationStorage, beaconStorage] = await Promise.all([
      client.getStorageAt({ address: token, slot: IMPLEMENTATION_SLOT }),
      client.getStorageAt({ address: token, slot: BEACON_SLOT }),
    ]);
    const implementationAddress = storageAddress(implementationStorage);
    const beaconAddress = storageAddress(beaconStorage);

    if (implementationAddress) {
      return {
        type: "eip1967",
        implementationAddress,
        beaconAddress: null,
      };
    }

    if (beaconAddress) {
      const implementation = await readAddressGetter(
        client,
        beaconAddress,
        "implementation",
      );

      return {
        type: "beacon",
        implementationAddress: firstNonZeroAddress(implementation),
        beaconAddress,
      };
    }

    return { type: "none", implementationAddress: null, beaconAddress: null };
  } catch {
    return { type: "unknown", implementationAddress: null, beaconAddress: null };
  }
}

async function readAddressGetter(
  client: RpcClient,
  token: Address,
  functionName: string,
): Promise<RawRead<Address>> {
  return readGetter<Address>(client, token, functionName, "address");
}

async function readBooleanGetter(
  client: RpcClient,
  token: Address,
  functionName: string,
): Promise<RawRead<boolean>> {
  return readGetter<boolean>(client, token, functionName, "bool");
}

async function readNumberGetter(
  client: RpcClient,
  token: Address,
  functionName: string,
): Promise<RawRead<number>> {
  return readGetter<number>(client, token, functionName, "uint8");
}

async function readStringGetter(
  client: RpcClient,
  token: Address,
  functionName: string,
): Promise<RawRead<string>> {
  return readGetter<string>(client, token, functionName, "string");
}

async function readGetter<T>(
  client: RpcClient,
  token: Address,
  functionName: string,
  returnType: "address" | "bool" | "bytes32" | "string" | "uint8",
): Promise<RawRead<T>> {
  const abi = parseAbi([
    `function ${functionName}() view returns (${returnType})`,
  ]) as Abi;

  try {
    const value = await client.readContract({
      address: token,
      abi,
      functionName,
    });

    return { ok: true, value: value as T };
  } catch {
    return { ok: false, error: "Contract getter unavailable." };
  }
}

function valueOrNull<T>(read: RawRead<T>): T | null {
  return read.ok ? read.value : null;
}

function firstNonZeroAddress(...reads: RawRead<Address>[]): Address | null {
  for (const read of reads) {
    if (read.ok && !isZeroAddress(read.value)) {
      return read.value;
    }
  }

  return null;
}

function firstRoleMember(...roles: RoleInfo[]): Address | null {
  return roles.find((role) => role.memberAddress)?.memberAddress ?? null;
}

function addressReadsStatus(
  address: Address | null,
  ...reads: RawRead<Address>[]
): FlagStatus {
  if (address) {
    return "present";
  }

  return reads.some((read) => !read.ok) ? "unknown" : "absent";
}

function mintStatus(
  minterAddress: Address | null,
  minterRole: RoleInfo,
  mintingFinished: RawRead<boolean>,
  isMintingFinished: RawRead<boolean>,
): FlagStatus {
  if (minterAddress || minterRole.status === "present") {
    return "present";
  }

  if (mintingFinished.ok) {
    return mintingFinished.value ? "absent" : "present";
  }

  if (isMintingFinished.ok) {
    return isMintingFinished.value ? "absent" : "present";
  }

  return minterRole.status;
}

function freezeStatus(
  authorityAddress: Address | null,
  paused: RawRead<boolean>,
  roles: RoleInfo[],
  ...reads: RawRead<Address>[]
): FlagStatus {
  if (authorityAddress || (paused.ok && paused.value)) {
    return "present";
  }

  if (roles.some((role) => role.status === "present")) {
    return "present";
  }

  if (
    reads.some((read) => !read.ok) ||
    roles.some((role) => role.status === "unknown") ||
    !paused.ok
  ) {
    return "unknown";
  }

  return "absent";
}

function storageAddress(value: Hex | undefined): Address | null {
  if (!value || value.length < 42) {
    return null;
  }

  const address = `0x${value.slice(-40)}` as Address;
  return isZeroAddress(address) ? null : address;
}

function isZeroAddress(address: Address): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

const ACCESS_CONTROL_ABI = parseAbi([
  "function getRoleMemberCount(bytes32 role) view returns (uint256)",
  "function getRoleMember(bytes32 role, uint256 index) view returns (address)",
]);
