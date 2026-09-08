export type FlagStatus = "present" | "absent" | "unknown";

export type TokenAuthorityFlags = {
  mint: FlagStatus;
  freeze: FlagStatus;
  owner: FlagStatus;
  feeWallet: FlagStatus;
};

export async function readTokenAuthorityFlags(
  tokenAddress: string,
): Promise<TokenAuthorityFlags> {
  // TODO Stage 1: read token rights via known ABIs and eth_call only.
  void tokenAddress;

  return {
    mint: "unknown",
    freeze: "unknown",
    owner: "unknown",
    feeWallet: "unknown",
  };
}

