import { signal } from '@preact/signals';

export const toastMessage = signal<{ text: string; id: number } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let seq = 0;

/** Ekranın altında kısa süreli bilgi mesajı */
export function toast(text: string, ms = 2600) {
  clearTimeout(timer);
  toastMessage.value = { text, id: ++seq };
  timer = setTimeout(() => (toastMessage.value = null), ms);
}
