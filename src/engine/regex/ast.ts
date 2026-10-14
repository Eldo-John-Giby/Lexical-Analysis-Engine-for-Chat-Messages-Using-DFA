import { CharSet, RegexNode } from '../types';

export function empty(): RegexNode {
  return { t: 'empty' };
}

export function eps(): RegexNode {
  return { t: 'eps' };
}

export function setNode(set: CharSet, label: string): RegexNode {
  return { t: 'set', set, label };
}

export function cat(a: RegexNode, b: RegexNode): RegexNode {
  if (a.t === 'empty' || b.t === 'empty') return empty();
  if (a.t === 'eps') return b;
  if (b.t === 'eps') return a;
  return { t: 'cat', a, b };
}

export function alt(a: RegexNode, b: RegexNode): RegexNode {
  if (a.t === 'empty') return b;
  if (b.t === 'empty') return a;
  return { t: 'alt', a, b };
}

export function star(a: RegexNode): RegexNode {
  if (a.t === 'empty' || a.t === 'eps') return eps();
  if (a.t === 'star') return a;
  return { t: 'star', a };
}

export function plus(a: RegexNode): RegexNode {
  if (a.t === 'empty') return empty();
  if (a.t === 'eps') return eps();
  return { t: 'plus', a };
}

export function opt(a: RegexNode): RegexNode {
  if (a.t === 'empty') return eps();
  if (a.t === 'eps') return eps();
  return { t: 'opt', a };
}

export function rep(a: RegexNode, min: number, max: number | null): RegexNode {
  if (min === 0 && max === null) return star(a);
  if (min === 1 && max === null) return plus(a);
  if (min === 0 && max === 1) return opt(a);
  return { t: 'rep', a, min, max };
}
