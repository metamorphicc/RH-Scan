export function debugApiEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.RHCHECK_ENABLE_DEBUG_API === "true"
  );
}
