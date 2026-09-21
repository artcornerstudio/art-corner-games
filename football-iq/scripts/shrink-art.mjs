// Downscale generated art (mascot, badges) into app-sized PNGs with the white
// background made transparent (flood fill from the edges, so white inside the
// badge stays white). Usage: node scripts/shrink-art.mjs <inDir> <outDir> <sizePx>
// Badges go in public/art as badge-<unitId>.png at 256px; the mascot as mascot.png at 360px.
import { chromium } from "playwright-core";
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
const [inDir, outDir, sizeArg] = process.argv.slice(2);
const size = Number(sizeArg);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: size, height: size } });
for (const f of readdirSync(inDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
  const b64 = readFileSync(`${inDir}/${f}`).toString("base64");
  const mime = f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const dataUrl = await page.evaluate(async ({ src, size }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const im = ctx.getImageData(0, 0, size, size);
    const d = im.data;
    const isWhite = (i) => d[i] > 228 && d[i + 1] > 228 && d[i + 2] > 228;
    const seen = new Uint8Array(size * size);
    const stack = [];
    for (let x = 0; x < size; x++) { stack.push(x, (size - 1) * size + x); }
    for (let y = 0; y < size; y++) { stack.push(y * size, y * size + size - 1); }
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      if (!isWhite(p * 4)) continue;
      d[p * 4 + 3] = 0;
      const x = p % size, y = (p - x) / size;
      if (x > 0) stack.push(p - 1);
      if (x < size - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - size);
      if (y < size - 1) stack.push(p + size);
    }
    // Soften the cut edge: pixels next to transparent ones that are light get partial alpha.
    ctx.putImageData(im, 0, 0);
    return c.toDataURL("image/png");
  }, { src: `data:${mime};base64,${b64}`, size });
  writeFileSync(`${outDir}/${f.replace(/\.(jpe?g|webp)$/i, ".png")}`, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log("wrote", f);
}
await browser.close();
