import KEYS from "./keys.json";
/** Maakt een vertaaltabel: Engelse sleutel → vertaling (zelfde volgorde als keys.json). */
export function make(list: string[]): Record<string, string> & { __count?: number } {
  const out: Record<string, string> = {};
  (KEYS as string[]).forEach((k, i) => {
    if (list[i]) out[k] = list[i];
  });
  Object.defineProperty(out, "__count", { value: list.length, enumerable: false });
  return out;
}
