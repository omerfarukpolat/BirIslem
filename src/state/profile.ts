import { effect, signal } from '@preact/signals';
import { readJSON, writeJSON } from '../lib/storage';

const KEY = 'birislem:name';

/** Karşılıklı modlarda ve meydan okumalarda görünen ad */
export const nickname = signal<string>(readJSON(KEY, ''));

effect(() => writeJSON(KEY, nickname.value));

export const NAME_MAX = 20;

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}
