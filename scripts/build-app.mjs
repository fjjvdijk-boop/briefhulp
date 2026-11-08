// Bouwt de app voor de App Store en Play Store: Next.js als losse bestanden (out/), zonder server-routes.
// De map app/api wordt even opzij gezet (een app heeft geen eigen server) en daarna altijd teruggezet.
// Daarna: npx cap sync (kopieert out/ naar de Android- en iOS-projecten).
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

// Server-onderdelen die een app niet heeft: even opzij zetten, daarna altijd terug.
const MOVE = [
  ["app/api", ".api-tijdelijk-weg"],
  ["middleware.ts", ".middleware-tijdelijk-weg.ts"],
];
for (const [from, away] of MOVE) if (existsSync(away)) renameSync(away, from); // na een eerdere onderbroken bouw
rmSync("out", { recursive: true, force: true });
for (const [from, away] of MOVE) renameSync(from, away);
try {
  execSync("node scripts/copy-vendor.mjs && npx next build", {
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "app", NEXT_PUBLIC_PLATFORM: "app" },
  });
} finally {
  for (const [from, away] of MOVE) renameSync(away, from);
}
rmSync("out/sw.js", { force: true }); // geen service worker in de app: alles zit er al in
console.log("\nKlaar: out/ bevat de app. Nu: npx cap sync");
