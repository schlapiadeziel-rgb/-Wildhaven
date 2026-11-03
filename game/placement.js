// Fence/wall placement math.
// Local +X is the long axis. World offset of that axis matches Three.js
// rotation.y: (x, z) -> (x cos θ, -x sin θ).

export const FENCE_HALF = 1.3;
export const WALL_HALF = 1.5;
export const FENCE_STEP = Math.PI / 4;

export function quantizeAngle(angle = 0, step = FENCE_STEP) {
  const tau = Math.PI * 2;
  let a = Math.round((Number(angle) || 0) / step) * step;
  a = ((a % tau) + tau) % tau;
  if (a < 1e-8) a = 0;
  return a;
}

// A fence is a line, so 180° is the same piece. Keep four 45° facings.
export function quantizeFenceAngle(angle = 0) {
  let a = quantizeAngle(angle, FENCE_STEP);
  if (a >= Math.PI - 1e-6) a = quantizeAngle(a - Math.PI, FENCE_STEP);
  return a;
}

export function nextBuildAngle(type, angle = 0) {
  if (type === "wall" || type === "door")
    return Math.abs(Math.cos(angle || 0)) > 0.5 ? Math.PI / 2 : 0;
  if (type === "fence") return quantizeFenceAngle((angle || 0) + FENCE_STEP);
  return quantizeAngle((angle || 0) + Math.PI / 2, FENCE_STEP);
}

export function pieceAxis(angle, half) {
  return { x: Math.cos(angle) * half, z: -Math.sin(angle) * half };
}

export function pieceEndpoints(x, z, angle, half) {
  const d = pieceAxis(angle || 0, half);
  return [
    { x: x - d.x, z: z - d.z },
    { x: x + d.x, z: z + d.z },
  ];
}

export function halfExtent(type) {
  return type === "fence" ? FENCE_HALF : WALL_HALF;
}

export function gridSnapFence(x, z, angle) {
  const along = pieceAxis(angle, 1);
  const px = -along.z;
  const pz = along.x;
  const span = FENCE_HALF * 2;
  const u = x * along.x + z * along.z;
  const v = x * px + z * pz;
  const n = Math.round((u - FENCE_HALF) / span);
  const m = Math.round(v / span);
  const u2 = FENCE_HALF + n * span;
  const v2 = m * span;
  return { x: along.x * u2 + px * v2, z: along.z * u2 + pz * v2, angle };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function segmentDistance(p1, q1, p2, q2) {
  const d1x = q1.x - p1.x,
    d1z = q1.z - p1.z;
  const d2x = q2.x - p2.x,
    d2z = q2.z - p2.z;
  const rx = p1.x - p2.x,
    rz = p1.z - p2.z;
  const a = d1x * d1x + d1z * d1z;
  const e = d2x * d2x + d2z * d2z;
  const f = d2x * rx + d2z * rz;
  const eps = 1e-8;
  let s, t;
  if (a <= eps && e <= eps)
    return { dist: Math.hypot(p1.x - p2.x, p1.z - p2.z), ta: 0, tb: 0 };
  if (a <= eps) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1z * rz;
    if (e <= eps) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1z * d2z;
      const denom = a * e - b * b;
      s = denom > eps ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  const cx = p1.x + d1x * s,
    cz = p1.z + d1z * s;
  const dx = p2.x + d2x * t,
    dz = p2.z + d2z * t;
  return { dist: Math.hypot(cx - dx, cz - dz), ta: s, tb: t };
}

// True when two pieces occupy the same space. Meeting at an endpoint is allowed.
export function segmentsConflict(a, b, gap = 0.32) {
  if (Math.hypot(a.x - b.x, a.z - b.z) < Math.min(a.half, b.half) * 0.8)
    return true;
  const ae = pieceEndpoints(a.x, a.z, a.angle || 0, a.half);
  const be = pieceEndpoints(b.x, b.z, b.angle || 0, b.half);
  const hit = segmentDistance(ae[0], ae[1], be[0], be[1]);
  if (hit.dist > gap) return false;
  const aEnd = hit.ta <= 0.14 || hit.ta >= 0.86;
  const bEnd = hit.tb <= 0.14 || hit.tb >= 0.86;
  return !(aEnd && bEnd);
}

function overlapsPiece(buildings, x, z, angle) {
  const next = { x, z, angle, half: FENCE_HALF };
  return buildings.some(
    (b) =>
      (b.type === "fence" || b.type === "wall" || b.type === "door") &&
      segmentsConflict(next, {
        x: b.x,
        z: b.z,
        angle: b.angle || 0,
        half: halfExtent(b.type),
      }),
  );
}

export function snapFence(buildings, x, z, angle = 0) {
  angle = quantizeFenceAngle(angle);
  const dir = pieceAxis(angle, FENCE_HALF);
  const ends = [];
  for (const b of buildings) {
    if (b.type !== "fence" && b.type !== "wall" && b.type !== "door") continue;
    ends.push(...pieceEndpoints(b.x, b.z, b.angle || 0, halfExtent(b.type)));
  }
  const near = ends
    .map((p) => ({ ...p, d: Math.hypot(x - p.x, z - p.z) }))
    .filter((p) => p.d < 3)
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);
  const candidates = [];
  for (const end of near) {
    for (const side of [1, -1]) {
      const cx = end.x + dir.x * side;
      const cz = end.z + dir.z * side;
      candidates.push({
        x: cx,
        z: cz,
        angle,
        overlap: overlapsPiece(buildings, cx, cz, angle),
        d: Math.hypot(cx - x, cz - z) + end.d * 0.05,
      });
    }
  }
  const open = candidates.filter((c) => !c.overlap).sort((a, b) => a.d - b.d);
  if (open.length) return { x: open[0].x, z: open[0].z, angle: open[0].angle };
  const grid = gridSnapFence(x, z, angle);
  if (!overlapsPiece(buildings, grid.x, grid.z, angle)) return grid;
  const blocked = candidates.sort((a, b) => a.d - b.d)[0];
  return blocked
    ? { x: blocked.x, z: blocked.z, angle: blocked.angle }
    : grid;
}

// Push a point out of a fence's oriented box. Returns null when it is clear.
export function resolveFence(x, z, fence) {
  const a = fence.angle || 0;
  const c = Math.cos(a),
    s = Math.sin(a);
  const lx = c * (x - fence.x) - s * (z - fence.z);
  const lz = s * (x - fence.x) + c * (z - fence.z);
  const hx = FENCE_HALF + 0.06,
    hz = 0.42;
  if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) return null;
  const penX = hx - Math.abs(lx);
  const penZ = hz - Math.abs(lz);
  let nlx = lx,
    nlz = lz;
  if (penZ <= penX) nlz = Math.sign(lz || 1) * (hz + 0.02);
  else nlx = Math.sign(lx || 1) * (hx + 0.02);
  return {
    x: fence.x + c * nlx + s * nlz,
    z: fence.z - s * nlx + c * nlz,
  };
}
