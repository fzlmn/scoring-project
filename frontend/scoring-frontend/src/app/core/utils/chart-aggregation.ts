import { Periode } from '../../shared/components/ui/time-filter.component';

/**
 * Client-side aggregation of the fixed windows the backend currently returns
 * (daily "dd/MM" over 14 days, monthly "Mmm YY" over 6 months) into the
 * granularity chosen by the time filter. Structured so that, once the backend
 * exposes a `periode` parameter, these helpers can be bypassed.
 */

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface Cat { label: string; count: number; }
export interface Dec { periode: string; valides: number; rejetes: number; }

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Group consecutive items by a key (preserving order), summing a numeric field. */
function groupSum<T>(items: T[], keyOf: (x: T) => string, valueOf: (x: T) => number): { label: string; count: number }[] {
  const order: string[] = [];
  const map = new Map<string, number>();
  for (const it of items) {
    const k = keyOf(it);
    if (!map.has(k)) order.push(k);
    map.set(k, (map.get(k) || 0) + valueOf(it));
  }
  return order.map(k => ({ label: k, count: map.get(k)! }));
}

/** Month label from a daily "dd/MM" label. */
function monthOfDaily(label: string): string {
  const mm = parseInt(label.split('/')[1], 10);
  return Number.isFinite(mm) ? MOIS[mm - 1] : label;
}

export function bucketCategory(pts: Cat[], periode: Periode, native: 'jour' | 'mois'): Cat[] {
  if (!pts || pts.length === 0) return [];
  if (native === 'jour') {
    switch (periode) {
      case 'jour': return pts;
      case 'semaine':
        return chunk(pts, 7).map(c => ({ label: c[0].label + '–' + c[c.length - 1].label, count: c.reduce((s, p) => s + p.count, 0) }));
      case 'mois':
        return groupSum(pts, p => monthOfDaily(p.label), p => p.count);
      case 'annee':
        return [{ label: String(new Date().getFullYear()), count: pts.reduce((s, p) => s + p.count, 0) }];
    }
  }
  // native monthly "Mmm YY"
  if (periode === 'annee') {
    return groupSum(pts, p => '20' + (p.label.split(' ')[1] || ''), p => p.count);
  }
  return pts; // jour / semaine / mois -> monthly as-is (no finer data available)
}

export function bucketDecision(pts: Dec[], periode: Periode): Dec[] {
  if (!pts || pts.length === 0) return [];
  switch (periode) {
    case 'jour': return pts;
    case 'semaine':
      return chunk(pts, 7).map(c => ({
        periode: c[0].periode + '–' + c[c.length - 1].periode,
        valides: c.reduce((s, p) => s + p.valides, 0),
        rejetes: c.reduce((s, p) => s + p.rejetes, 0),
      }));
    case 'mois': {
      const order: string[] = [];
      const map = new Map<string, Dec>();
      for (const p of pts) {
        const k = monthOfDaily(p.periode);
        if (!map.has(k)) { order.push(k); map.set(k, { periode: k, valides: 0, rejetes: 0 }); }
        const d = map.get(k)!; d.valides += p.valides; d.rejetes += p.rejetes;
      }
      return order.map(k => map.get(k)!);
    }
    case 'annee':
      return [{
        periode: String(new Date().getFullYear()),
        valides: pts.reduce((s, p) => s + p.valides, 0),
        rejetes: pts.reduce((s, p) => s + p.rejetes, 0),
      }];
  }
}
