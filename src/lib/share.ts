import { toast } from '../state/toast';

/** Mobilde paylaşım menüsünü açar, masaüstünde panoya kopyalar. */
export async function shareOrCopy(data: { title?: string; text: string; url?: string }): Promise<void> {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse && nav.share) {
    try {
      await nav.share(data);
      return;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
  }
  const text = data.url ? `${data.text}\n${data.url}` : data.text;
  try {
    await navigator.clipboard.writeText(text);
    toast('Panoya kopyalandı');
  } catch {
    window.prompt('Kopyala:', text);
  }
}
