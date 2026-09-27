/** Firebase hatalarını oyuncuya anlaşılır bir cümleye çevirir. */
export function onlineErrorText(err: unknown): string {
  const code = (err as { code?: string })?.code ?? (err as Error)?.message ?? '';
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
    return 'Misafir girişi şu an kapalı. Google ile giriş yapıp tekrar dene.';
  }
  if (code === 'auth/network-request-failed' || code === 'unavailable') {
    return 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.';
  }
  if (code === 'permission-denied') return 'Bu işlem için izin yok. Oda kapanmış ya da maç başlamış olabilir.';
  if (code === 'firebase-disabled') return 'Çevrimiçi oyun şu an kullanılamıyor.';
  return 'Bir şeyler ters gitti. Birazdan tekrar dene.';
}

export function needsGoogle(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation';
}
