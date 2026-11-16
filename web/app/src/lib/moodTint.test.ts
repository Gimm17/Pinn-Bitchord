import { describe, expect, it } from 'vitest';
import { moodGradient, moodTint, parseColor } from './moodTint';

/** OKLCH from a `#rrggbb`, to check what a tint actually renders as. */
function oklch(hex: string): { l: number; c: number; h: number } {
  const n = hex.slice(1);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(n.slice(i, i + 2), 16)));
  const l_ = Math.cbrt(0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!);
  const m_ = Math.cbrt(0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!);
  const s_ = Math.cbrt(0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

/** Real YouTube mood stripes (youtubei musicNavigationButtonRenderer). */
const STRIPES = {
  chill: '#A4C5FF',
  commute: '#FFC200',
  energize: '#FFE780',
  feelGood: '#A4FFA4',
  party: '#B47BFF',
  romance: '#CC0000',
  workout: '#FF8D40',
  dance: '#0092BF',
};

describe('parseColor', () => {
  it('reads the rgb() form the app emits and the hex form', () => {
    expect(parseColor('rgb(164, 197, 255)')).toMatchObject({ h: expect.closeTo(262, 0) });
    expect(parseColor('#A4C5FF')).toMatchObject({ h: expect.closeTo(262, 0) });
  });

  it('returns null for something that is not a colour', () => {
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('')).toBeNull();
  });
});

describe('moodTint', () => {
  it('keeps the hue YouTube sent, so a mood still reads as its own family', () => {
    for (const [name, stripe] of Object.entries(STRIPES)) {
      const source = parseColor(stripe)!;
      const tint = moodTint(stripe);
      // Within 3 degrees: 8-bit hex rounding moves hue slightly, and a
      // shift that small is not perceptible on a tile this size.
      expect(Math.abs(oklch(tint.fromLight).h - source.h), `${name} light hue`).toBeLessThan(3);
      expect(Math.abs(oklch(tint.fromDark).h - source.h), `${name} dark hue`).toBeLessThan(3);
    }
  });

  it('lands every stripe in the reference tile family, not at the stripe’s own weight', () => {
    // Reference tiles measured at L 0.925-0.951 / C 0.023-0.032 at the left edge.
    for (const stripe of Object.values(STRIPES)) {
      const { l, c } = oklch(moodTint(stripe).fromLight);
      expect(l).toBeGreaterThan(0.92);
      expect(l).toBeLessThan(0.95);
      expect(c).toBeGreaterThan(0.02);
      expect(c).toBeLessThan(0.04);
    }
  });

  it('holds the dark tile above the card it sits on, and saturated enough to read', () => {
    /*
     * Measured defect this guards: at the old dark C 0.034, Commute rendered
     * #28200C — brown mud, the same weight as Energize two hues away.
     */
    for (const stripe of Object.values(STRIPES)) {
      const dark = oklch(moodTint(stripe).fromDark);
      expect(dark.l, 'clears the #1D1D19 card at L 0.229').toBeGreaterThan(0.26);
      expect(dark.c, 'reads as a colour, not a grey').toBeGreaterThan(0.045);
    }
  });

  it('does not let neutral stripes inherit a random hue', () => {
    for (const grey of ['#CCCCCC', '#606060', '#444444']) {
      const tint = moodTint(grey);
      expect(oklch(tint.fromLight).c).toBeLessThan(0.005);
      expect(oklch(tint.fromDark).c).toBeLessThan(0.005);
    }
  });

  it('falls back to a neutral when the stripe cannot be parsed', () => {
    expect(() => moodTint('not-a-colour')).not.toThrow();
    expect(oklch(moodTint('not-a-colour').fromLight).c).toBeLessThan(0.005);
  });
});

describe('moodGradient', () => {
  it('sweeps left to right between the two scheme endpoints', () => {
    const tint = moodTint(STRIPES.chill);
    expect(moodGradient(tint, false)).toBe(`linear-gradient(90deg, ${tint.fromLight}, ${tint.toLight})`);
    expect(moodGradient(tint, true)).toBe(`linear-gradient(90deg, ${tint.fromDark}, ${tint.toDark})`);
  });

  it('gets deeper toward the right edge, in both schemes', () => {
    for (const stripe of Object.values(STRIPES)) {
      for (const dark of [false, true]) {
        const tint = moodTint(stripe);
        const from = oklch(dark ? tint.fromDark : tint.fromLight);
        const to = oklch(dark ? tint.toDark : tint.toLight);
        const where = `${stripe} ${dark ? 'dark' : 'light'}`;
        // The sweep must always travel somewhere: darker, or more saturated,
        // or both. Never still.
        expect(to.l < from.l || to.c > from.c, `${where} sweep`).toBe(true);
        // On dark it always deepens by lightness; chroma is capped by the
        // sRGB edge for warm hues and cannot be asked to grow.
        if (dark) expect(to.l, `${where} deepens`).toBeLessThan(from.l);
        // On light the feature is a sheen: same lightness band, more chroma.
        if (!dark) expect(to.c, `${where} chroma`).toBeGreaterThan(from.c);
      }
    }
  });
});
