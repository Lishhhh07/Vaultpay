/** "150", "150.5", "1,500.25" -> paise. Returns null if invalid. */
export function rupeesToPaise(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, paise = ""] = s.split(".");
  return Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
}

export function formatINR(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" });
}