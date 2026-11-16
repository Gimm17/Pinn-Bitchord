/**
 * Mood tile tints.
 *
 * Sampled from the reference artboard: a mood tile is a **borderless card
 * whose fill runs left-to-right from a pale tint into a slightly deeper one**
 * of the same hue, carrying a saturated label of that hue. There is no
 * outline — the 1px darker row at the tile's bottom edge is only the fill's
 * own anti-aliased boundary.
 *
 * YouTube supplies one colour per category: a solid "stripe". It cannot be
 * painted with directly, for two reasons that measurement made obvious:
 *
 *  - The stripes are not one family. `#FEE680` (butter yellow) sits beside
 *    `#0092BF` (saturated teal) and `#CC0000`. Painting them as-is gives a
 *    row of chips at wildly different weights, not one calm grid.
 *  - Some are light enough that white text cannot sit on them, which is what
 *    forced the old design to put a white glyph on a raw stripe.
 *
 * So the stripe is read as a HUE only. Each tile's fill endpoints and label
 * are generated at fixed OKLCH lightness/chroma, keeping the hue; a near-grey
 * stripe keeps its neutral instead of having rounding noise amplified into a
 * colour. Four different stripes then land as four equal-weight tiles that
 * still say which kind of mood each one is.
 */

export interface MoodTint {
  /** Tile fill, left edge, per scheme. */
  fromLight: string;
  fromDark: string;
  /** Tile fill, right edge: same hue, a step deeper. */
  toLight: string;
  toDark: string;
  /** Label, per scheme. Clear of the fill in both. */
  inkLight: string;
  inkDark: string;
}

const DEFAULT_STRIPE = '#444444';

/*
 * The tile family, as measured off the reference's four tiles: the left edge
 * sits at L 0.927–0.951 / C 0.023–0.032 and the right at L 0.885–0.911 /
 * C 0.035–0.054. These are those ranges' centres, so the sweep is a sheen
 * rather than a two-tone block.
 *
 * Dark is NOT the same sweep dimmed. Chroma and lightness are not
 * perceptually proportional: at L 0.93 a C 0.03 tint reads as a clear pastel,
 * but the same C 0.03 at L 0.25 on a near-black canvas reads as brown mud —
 * measured on a real screenshot, Commute came out #28200C, indistinguishable
 * from Energize two hues away. The dark family therefore runs at roughly
 * 1.6x the chroma, and its right edge is held above the card's own L 0.229 so
 * the gradient never dips below the surface it may be drawn on.
 *
 * The dark sweep deepens by LIGHTNESS, not chroma. Yellow at L 0.25 cannot
 * hold more chroma than at L 0.30 — it is already at the sRGB edge — so
 * asking for a more saturated right edge silently gets a *less* saturated
 * one after gamut mapping. Going darker instead is what "a step deeper"
 * means here, and it behaves the same for every hue.
 */
const FROM_LIGHT: [number, number] = [0.938, 0.026];
const TO_LIGHT: [number, number] = [0.895, 0.046];
const FROM_DARK: [number, number] = [0.302, 0.055];
const TO_DARK: [number, number] = [0.248, 0.048];

/*
 * The label. Light sits at 0.45 — the band the reference's four labels
 * occupy (#3368A0, #92400E, #065F46, #6B21A8 are all 0.43–0.51) — dropped
 * to 0.44 so the palest stripe YouTube sends (a cyan `#4DEEFF`) still clears
 * 4.5:1 against its own fill. Dark lifts to 0.820.
 */
const INK_LIGHT: [number, number] = [0.44, 0.17];
const INK_DARK: [number, number] = [0.82, 0.11];

type Rgb = [number, number, number];

const toLinear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c: number): number => Math.min(1, Math.max(0, c));

/** `rgb(r, g, b)` (the form `argbToCss` emits) or `#rrggbb` to OKLCH. */
export function parseColor(css: string): { l: number; c: number; h: number } | null {
  const s = css.trim();
  let rgb: Rgb | null = null;
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (fn) rgb = [+fn[1]! / 255, +fn[2]! / 255, +fn[3]! / 255];
  const hex = /^#([\da-f]{6})$/i.exec(s);
  if (hex) {
    const n = hex[1]!;
    rgb = [parseInt(n.slice(0, 2), 16) / 255, parseInt(n.slice(2, 4), 16) / 255, parseInt(n.slice(4, 6), 16) / 255];
  }
  if (!rgb) return null;
  const [r, g, b] = rgb.map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s2;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s2;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s2;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

/**
 * OKLCH to sRGB hex, with the chroma reduced until the colour is actually
 * representable.
 *
 * Clamping each channel into [0,1] independently is not gamut mapping: it
 * shifts the hue and drags chroma down unpredictably, so a "deeper" right
 * edge could come out *less* saturated than the left one. Yellow at L 0.255
 * is the case that exposed it — C 0.075 is well outside sRGB there. Instead
 * the lightness and hue are held and C is bisected down to the edge of the
 * gamut, which keeps the tile's family intact.
 */
function oklchToHex(l: number, c: number, hDeg: number): string {
  const rad = (hDeg * Math.PI) / 180;
  const raw = (chroma: number): Rgb => {
    const a = chroma * Math.cos(rad);
    const b = chroma * Math.sin(rad);
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.291485548 * b;
    const [L, M, S] = [l_ ** 3, m_ ** 3, s_ ** 3];
    return [
      toSrgb(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
      toSrgb(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
      toSrgb(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
    ];
  };
  const inGamut = (rgb: Rgb): boolean => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

  let chroma = c;
  if (!inGamut(raw(chroma))) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(raw(mid))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }

  return '#' + raw(chroma).map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * The six colours a tile needs, from YouTube's stripe colour. A stripe the
 * parser cannot read falls back to a neutral, never to a fabricated hue.
 */
export function moodTint(stripe: string): MoodTint {
  const parsed = parseColor(stripe) ?? parseColor(DEFAULT_STRIPE)!;
  // Hue is lost on a near-grey stripe; keep the neutral there instead of
  // amplifying rounding noise into a colour.
  const neutral = parsed.c < 0.01;
  const h = neutral ? 0 : parsed.h;
  const c = neutral ? 0 : parsed.c;
  const tone = ([light, cap]: [number, number], scale = 1) => oklchToHex(light, Math.min(c * scale, cap), h);
  return {
    fromLight: tone(FROM_LIGHT),
    fromDark: tone(FROM_DARK),
    toLight: tone(TO_LIGHT, 1.8),
    toDark: tone(TO_DARK, 1.2),
    inkLight: tone(INK_LIGHT, 1.5),
    inkDark: tone(INK_DARK),
  };}

/**
 * The tile's fill as a CSS gradient. The reference sweeps left-to-right; the
 * angle is given in the same terms CSS uses (90deg = to right).
 */
export function moodGradient(tint: MoodTint, dark: boolean): string {
  return `linear-gradient(90deg, ${dark ? tint.fromDark : tint.fromLight}, ${dark ? tint.toDark : tint.toLight})`;
}
