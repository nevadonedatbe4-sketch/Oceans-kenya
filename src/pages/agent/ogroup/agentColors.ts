// Deterministic colour per agent so a team calendar can tell members apart
// without relying on colour alone (the name is always shown too).
const PALETTE = ['#0f766e', '#b45309', '#be123c', '#047857', '#c2410c', '#4d7c0f', '#9d174d', '#a16207'];

export function agentColor(id: string | null | undefined): string | null {
  if (!id) return null;
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}