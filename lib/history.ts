import type { SnapshotHistoryRecord } from "./db";

export type SnapshotChange = {
  field: string;
  from: string | null;
  to: string;
};

export type SnapshotWithChanges = SnapshotHistoryRecord & {
  changes: SnapshotChange[];
};

type ComparableSnapshot = {
  verdict: string;
  mint: string;
  freeze: string;
  owner: string;
  poolStatus: string;
  venue: string;
  quoteReserve: string;
  verified: string;
};

const FIELDS: Array<{
  key: keyof ComparableSnapshot;
  label: string;
}> = [
  { key: "verdict", label: "Verdict" },
  { key: "mint", label: "Mint authority" },
  { key: "freeze", label: "Freeze authority" },
  { key: "owner", label: "Owner authority" },
  { key: "poolStatus", label: "Pool status" },
  { key: "venue", label: "Pool venue" },
  { key: "quoteReserve", label: "Quote reserve" },
  { key: "verified", label: "Explorer verification" },
];

export function addSnapshotChanges(
  items: SnapshotHistoryRecord[],
): SnapshotWithChanges[] {
  return items.map((item, index) => {
    const older = items[index + 1];

    if (!older) {
      return {
        ...item,
        changes: [{ field: "Snapshot", from: null, to: "First recorded" }],
      };
    }

    const currentValues = comparableValues(item);
    const olderValues = comparableValues(older);
    const changes = FIELDS.flatMap(({ key, label }) =>
      currentValues[key] === olderValues[key]
        ? []
        : [
            {
              field: label,
              from: olderValues[key],
              to: currentValues[key],
            },
          ],
    );

    return { ...item, changes };
  });
}

function comparableValues(item: SnapshotHistoryRecord): ComparableSnapshot {
  const raw = asRecord(item.rawJson);
  const rights = asRecord(raw.rights);
  const flags = asRecord(rights.flags);
  const pool = asRecord(raw.pool);
  const explorer = asRecord(raw.explorer);
  const reserve = stringValue(pool.reserveQuoteFormatted);
  const quote = stringValue(pool.quoteSymbol);

  return {
    verdict: item.verdict,
    mint: stringValue(flags.mint),
    freeze: stringValue(flags.freeze),
    owner: stringValue(flags.owner),
    poolStatus: stringValue(pool.status),
    venue: stringValue(pool.venueLabel),
    quoteReserve:
      reserve === "unknown" ? reserve : `${reserve} ${quote}`.trim(),
    verified: booleanLabel(explorer.isVerified),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function booleanLabel(value: unknown): string {
  if (value === true) {
    return "verified";
  }

  if (value === false) {
    return "not verified";
  }

  return "unknown";
}
