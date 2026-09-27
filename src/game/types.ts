export type Op = '+' | '-' | '*' | '/';

export interface Puzzle {
  /** 5 farklı rakam (küçükten büyüğe) + 1 iki basamaklı sayı */
  numbers: number[];
  target: number;
}

export interface Tile {
  id: number;
  value: number;
  /** Başlangıçta verilen sayı mı, yoksa bir işlemin sonucu mu */
  base: boolean;
}

export interface Step {
  op: Op;
  a: Tile;
  b: Tile;
  result: Tile;
  aSlot: number;
  bSlot: number;
}

/** Kaydetmek / göstermek için sadeleştirilmiş işlem adımı */
export interface SimpleStep {
  a: number;
  op: Op;
  b: number;
  result: number;
}

export type FinishReason = 'exact' | 'submit' | 'timeout';

export interface RoundOutcome {
  /** Tur boyunca ulaşılan en yakın sonuç (hiç işlem yapılmadıysa null) */
  value: number | null;
  diff: number | null;
  /** En yakın sonuca turun kaçıncı milisaniyesinde ulaşıldı */
  reachedAtMs: number | null;
  /** Turun bittiği an (ms) */
  endedAtMs: number;
  steps: SimpleStep[];
  reason: FinishReason;
}
