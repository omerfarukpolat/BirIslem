/** localStorage erişimi gizli sekme / kapalı depolama durumlarında sessizce başarısız olur. */
export function readJSON<T>(key: string, fallback: T, store: Storage | undefined = safeLocal()): T {
  try {
    const raw = store?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown, store: Storage | undefined = safeLocal()): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* depolama dolu veya kapalı */
  }
}

export function removeKey(key: string, store: Storage | undefined = safeLocal()): void {
  try {
    store?.removeItem(key);
  } catch {
    /* yoksay */
  }
}

export function safeLocal(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function safeSession(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}
