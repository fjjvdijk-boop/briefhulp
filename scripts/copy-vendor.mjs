// Kopieert de leesprogramma-bestanden (OCR) naar public/vendor, zodat de app ze zelf host.
// Zo maakt de telefoon geen contact met andere servers: beter voor privacy en betrouwbaarheid.
import { cpSync, mkdirSync, readdirSync } from "node:fs";

const out = "public/vendor";
mkdirSync(`${out}/tesseract/lang`, { recursive: true });
mkdirSync(`${out}/pdfjs`, { recursive: true });

cpSync("node_modules/tesseract.js/dist/worker.min.js", `${out}/tesseract/worker.min.js`);
for (const f of readdirSync("node_modules/tesseract.js-core")) {
  if (/lstm\.wasm\.js$/.test(f)) cpSync(`node_modules/tesseract.js-core/${f}`, `${out}/tesseract/${f}`);
}
cpSync(
  "node_modules/@tesseract.js-data/nld/4.0.0_best_int/nld.traineddata.gz",
  `${out}/tesseract/lang/nld.traineddata.gz`,
);
cpSync("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", `${out}/pdfjs/pdf.worker.min.mjs`);
console.log("vendor-bestanden gekopieerd naar", out);
