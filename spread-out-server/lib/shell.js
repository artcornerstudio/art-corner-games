/**
 * Splits the single-file game into the free shell and the premium script.
 *
 * spread-out/index.html marks its premium code with /*PREMIUM-START*​/ and
 * /*PREMIUM-END*​/ comments. The server never sends what is between them to a
 * browser that has not proven a purchase: the free shell has those parts cut
 * out, and premium/premium.js (the cut-out parts, joined) is served only behind
 * the session cookie. The <!--SERVER-CONFIG--> marker in <head> becomes the
 * config script that turns the paywall on in the browser.
 */
const START = "/*PREMIUM-START*/";
const END = "/*PREMIUM-END*/";
const CONFIG = "<!--SERVER-CONFIG-->";

function splitGame(html, config) {
  const regions = [];
  let free = "";
  let i = 0;
  for (;;) {
    const s = html.indexOf(START, i);
    if (s < 0) { free += html.slice(i); break; }
    const e = html.indexOf(END, s);
    if (e < 0) throw new Error("PREMIUM-START without a PREMIUM-END");
    regions.push(html.slice(s + START.length, e));
    free += html.slice(i, s) + "/* premium content loads from the server after purchase */";
    i = e + END.length;
  }
  if (regions.length === 0) throw new Error("index.html has no premium regions to protect");
  if (!free.includes(CONFIG)) throw new Error("index.html has no <!--SERVER-CONFIG--> marker");
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  free = free.replace(CONFIG, `<script>window.SPREAD_OUT_CONFIG=${json};</script>`);
  return { free, premium: regions.join("\n") + "\n" };
}

module.exports = { splitGame, START, END, CONFIG };
