import { getAddress, isAddress, type Address } from "viem";

export class AddressValidationError extends Error {
  constructor(message = "Token address must be a valid 0x EVM address.") {
    super(message);
    this.name = "AddressValidationError";
  }
}

export function normalizeTokenAddress(input: string): Address {
  const trimmedInput = input.trim();

  if (!trimmedInput.startsWith("0x")) {
    throw new AddressValidationError("Token address must start with 0x.");
  }

  if (!isAddress(trimmedInput, { strict: false })) {
    throw new AddressValidationError();
  }

  return getAddress(trimmedInput);
}

