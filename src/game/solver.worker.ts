/// <reference lib="webworker" />
import { dailyPuzzle } from './dailyPuzzle';
import { solve } from './solver';
import type { SolverRequest, SolverResponse } from './solverClient';

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  const req = e.data;
  let res: SolverResponse;
  if (req.kind === 'solve') {
    res = { id: req.id, kind: 'solve', solution: solve(req.numbers, req.target, req.maxOps) };
  } else {
    res = { id: req.id, kind: 'daily', puzzle: dailyPuzzle(req.key) };
  }
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(res);
};
