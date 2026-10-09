// Turns OpenArt renders into app art: the stadium background (WebP), and the mascot and unit icons
// generated on a flat magenta (#FF00FF) backdrop, cut out to transparent PNGs.
// Needs sharp, which is not a project dependency: npm i --no-save sharp
//   node scripts/key-art.cjs bg     <stadium.png>   public/art
//   node scripts/key-art.cjs mascot <mascot.png>    public/art mascot-hero.png
//   node scripts/key-art.cjs icons  <icon-sheet.png> public/art   (3x3 sheet, in unit order)
const sharp = require("sharp");
const path = require("path");
const [kind, input, out] = process.argv.slice(2);

/** Remove a flat magenta (#FF00FF) backdrop: soft alpha by distance from magenta, plus de-spill on edges. */
async function keyMagenta(img, blueGlow = false) {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // How "magenta" a pixel is: red and blue high, green low.
    const m = Math.min(r, b) - g;            // 255 for pure magenta, <=0 for non-magenta
    const t = Math.max(0, Math.min(1, (m - 40) / 150)); // 0 = keep, 1 = remove
    data[i + 3] = Math.round(data[i + 3] * (1 - t));
    if (blueGlow && t > 0 && b >= r) {      // purple haze (hologram glow mixed with the backdrop): keep it, but as blue
      data[i] = Math.round(g + (r - g) * (1 - t) * 0.2);
    } else if (t > 0 && t < 1) {             // edge pixel: pull red/blue back toward green to kill the pink fringe
      const cap = g + (Math.max(r, b) - g) * (1 - t);
      data[i] = Math.min(r, cap); data[i + 2] = Math.min(b, cap);
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
}
async function trimPng(img, maxSide, file) {
  const buf = await img.png().toBuffer();
  const trimmed = await sharp(buf).trim({ threshold: 1 }).toBuffer();
  await sharp(trimmed).resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile(file);
  const m = await sharp(file).metadata(); console.log(path.basename(file), m.width + "x" + m.height);
}
(async () => {
  if (kind === "bg") {
    for (const [w, q, name] of [[2400, 72, "stadium-bg.webp"], [1200, 70, "stadium-bg-small.webp"]]) {
      await sharp(input).resize(w).webp({ quality: q, effort: 6 }).toFile(path.join(out, name));
      const m = await sharp(path.join(out, name)).metadata(); console.log(name, m.width + "x" + m.height);
    }
  } else if (kind === "mascot") {
    await trimPng(await keyMagenta(sharp(input), true), 640, path.join(out, process.argv[5] || "mascot-hero.png"));
  } else if (kind === "icons") {
    const ids = (process.argv[5] || "rules,offense,defense,reads,offense2,special,flag7,positions,coach").split(",");
    const meta = await sharp(input).metadata(); const cw = Math.floor(meta.width / 3), ch = Math.floor(meta.height / 3);
    for (let k = 0; k < 9; k++) {
      const inset = Math.round(cw * 0.02); const cell = sharp(input).extract({ left: (k % 3) * cw + inset, top: Math.floor(k / 3) * ch + inset, width: cw - 2 * inset, height: ch - 2 * inset });
      const keyed = await keyMagenta(sharp(await cell.png().toBuffer()));
      await trimPng(keyed, 256, path.join(out, `unit-${ids[k]}.png`));
    }
  }
})();
