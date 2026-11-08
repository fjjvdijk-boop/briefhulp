/** @type {import('next').NextConfig} */
// Strenge regels: de app mag alleen met zijn eigen server praten. Zo kan een brief technisch nergens anders heen.
// 'wasm-unsafe-eval' is nodig voor de tekstherkenning (WebAssembly); 'unsafe-inline' voor de opstartcode van Next.js.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: mediastream:",
  "connect-src 'self' data: blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// BUILD_TARGET=app: losse bestanden voor de app in de App Store / Play Store (Capacitor).
// Dan is er geen server: de gratis uitleg werkt helemaal op het toestel. Zie scripts/build-app.mjs.
const isApp = process.env.BUILD_TARGET === "app";

const nextConfig = isApp
  ? {
      output: "export",
      trailingSlash: true,
      images: { unoptimized: true },
      poweredByHeader: false,
    }
  : {
      poweredByHeader: false,
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
    };

export default nextConfig;
