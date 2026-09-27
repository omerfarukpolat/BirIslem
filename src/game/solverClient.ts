import type { Solution } from './solver';
import type { Puzzle } from './types';

export type SolverRequest =
  | { id: number; kind: 'solve'; numbers: number[]; target: number; maxOps: number }
  | { id: number; kind: 'daily'; key: string };

export type SolverResponse =
  | { id: number; kind: 'solve'; solution: Solution | null }
  | { id: number; kind: 'daily'; puzzle: Puzzle };

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, (res: SolverResponse) => void>();
const cache = new Map<string, Promise<unknown>>();
/** Çözülmüş sonuçlar: aynı soru tekrar istendiğinde beklemeden döner */
const settled = new Map<string, unknown>();

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<SolverResponse>) => {
        pending.get(e.data.id)?.(e.data);
        pending.delete(e.data.id);
      };
      worker.onerror = () => {
        workerBroken = true;
        worker = null;
      };
    } catch {
      workerBroken = true;
      return null;
    }
  }
  return worker;
}

/** Worker yoksa aynı işi ana iş parçacığında, bir sonraki turda yapar. */
async function runLocally(req: SolverRequest): Promise<SolverResponse> {
  await new Promise((r) => setTimeout(r, 0));
  if (req.kind === 'solve') {
    const { solve } = await import('./solver');
    return { id: req.id, kind: 'solve', solution: solve(req.numbers, req.target, req.maxOps) };
  }
  const { dailyPuzzle } = await import('./dailyPuzzle');
  return { id: req.id, kind: 'daily', puzzle: dailyPuzzle(req.key) };
}

function request(req: SolverRequest): Promise<SolverResponse> {
  const w = getWorker();
  if (!w) return runLocally(req);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // Worker takıldıysa yerelde hesapla
      pending.delete(req.id);
      runLocally(req).then(resolve);
    }, 8000);
    pending.set(req.id, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
    w.postMessage(req);
  });
}

function memo<T>(key: string, make: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = make().then((v) => {
      settled.set(key, v);
      if (settled.size > 64) settled.delete(settled.keys().next().value!);
      return v;
    });
    cache.set(key, p);
    if (cache.size > 64) cache.delete(cache.keys().next().value!);
  }
  return p;
}

const solveKey = (puzzle: Puzzle, maxOps: number) => `s:${puzzle.numbers.join(',')}:${puzzle.target}:${maxOps}`;

/** Daha önce çözülmüşse sonucu hemen verir; yoksa undefined. */
export function peekSolution(puzzle: Puzzle, maxOps = 0): Solution | null | undefined {
  const key = solveKey(puzzle, maxOps);
  return settled.has(key) ? (settled.get(key) as Solution | null) : undefined;
}

/** Sorunun en iyi çözümü (işlem sınırı 0 = sınırsız). */
export function solvePuzzle(puzzle: Puzzle, maxOps = 0): Promise<Solution | null> {
  return memo(solveKey(puzzle, maxOps), async () => {
    const res = await request({ id: ++seq, kind: 'solve', numbers: puzzle.numbers, target: puzzle.target, maxOps });
    return res.kind === 'solve' ? res.solution : null;
  });
}

export function getDailyPuzzle(key: string): Promise<Puzzle> {
  return memo(`d:${key}`, async () => {
    const res = await request({ id: ++seq, kind: 'daily', key });
    if (res.kind !== 'daily') throw new Error('unexpected solver response');
    return res.puzzle;
  });
}
