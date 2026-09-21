// Downscale generated art (mascot, badges) into app-sized PNGs.
// Usage: node scripts/shrink-art.mjs <inDir> <outDir> <sizePx>
// Badges go in public/art as badge-<unitId>.png at 256px; the mascot as mascot.png at 360px.
// Downscale generated art to small PNGs for the app. Usage: node shrink.mjs <inDir> <outDir> <size>
import { chromium } from "playwright-core";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
const [inDir, outDir, sizeArg] = process.argv.slice(2);
const size = Number(sizeArg);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: size, height: size } });
for (const f of readdirSync(inDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const b64 = readFileSync(`${inDir}/${f}`).toString("base64");
  const mime = f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg";
  await page.setContent(`<body style="margin:0;background:#fff"><img src="data:${mime};base64,${b64}" style="width:${size}px;height:${size}px;object-fit:contain;display:block"></body>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${outDir}/${f.replace(/\.(jpe?g|webp)$/i, ".png")}`, type: "png" });
  console.log("wrote", f);
}
await browser.close();
