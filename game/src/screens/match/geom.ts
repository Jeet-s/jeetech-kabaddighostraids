/**
 * Mat geometry: a slight top-down 3/4 view of ONE half of the court, the camera always behind my team.
 * My raid: the opponents' half (midline at the bottom, their end line at the top).
 * My defence: my half (my end line at the bottom, the midline at the top, the CPU raider coming down at me).
 * d = depth from the near edge (0) to the far edge (1); u = across, -1 (left lobby) .. 1 (right lobby).
 * Stylised distances (readability first): the formation stands mid-mat so every defender is big and tappable.
 */
export interface Geom {
  w: number; h: number;
  P: (u: number, d: number) => { x: number; y: number; s: number };
  /** Lines in depth units from the midline. */
  baulk: number; bonus: number;
}

export function makeGeom(w: number, h: number): Geom {
  const top = Math.round(h * 0.05), bottom = Math.round(h * 0.985);
  const nearHalf = w * 0.5 - 4, farHalf = w * 0.33;
  const P = (u: number, d: number) => {
    const f = Math.sign(d) * Math.abs(d) ** 1.12;
    const half = nearHalf + (farHalf - nearHalf) * f;
    return { x: w / 2 + u * half, y: bottom - (bottom - top) * f, s: 1 - 0.34 * f };
  };
  return { w, h, P, baulk: 0.26, bonus: 0.4 };
}

/**
 * Where defender slot i (0 = left corner … 6 = right corner) stands: a STAGGERED two-row chain so every defender is
 * distinct (QA render_defects 2026-11-07: a one-row zigzag packed #2/#3 and #5/#6 so tightly that shadows, danger
 * discs and tags merged). Even slots form the front row (a shallow arc, corners a little forward), odd slots stand a
 * full body-height further back in the gaps between them — on a 360x640 phone the back row's feet clear the front
 * row's heads and badges.
 */
export function slotSpot(i: number, defend: boolean): { u: number; d: number } {
  const u = -0.76 + i * (1.52 / 6);
  const k = (Math.abs(u) / 0.76) ** 2;
  const back = i % 2 === 1;
  if (defend) return { u, d: back ? 0.42 : 0.12 + 0.04 * k };
  return { u, d: back ? 0.8 : 0.5 - 0.05 * k };
}

/** Front (even) or back (odd) row of the defending chain. */
export const isBackRow = (i: number) => i % 2 === 1;
