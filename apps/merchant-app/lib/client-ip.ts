export function clientIpFrom(get: (name: string) => string | null | undefined): string {
  const first = get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || get("x-real-ip") || "local";
}