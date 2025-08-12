// Güçsüz cihazları tespit etmek için utility fonksiyonları

// Cihaz performansını değerlendir
export const isLowPerformanceDevice = (): boolean => {
  // Hardware concurrency (CPU çekirdek sayısı)
  const cpuCores = navigator.hardwareConcurrency || 1;
  
  // Device memory (RAM)
  const deviceMemory = (navigator as any).deviceMemory || 4;
  
  // Connection speed
  const connection = (navigator as any).connection;
  const isSlowConnection = connection && (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.effectiveType === '3g'
  );
  
  // User agent'dan mobil cihaz tespiti
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Touch screen tespiti (genellikle mobil cihazlarda)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Düşük performans kriterleri
  const isLowCPU = cpuCores <= 2;
  const isLowRAM = deviceMemory <= 2;
  
  // Güçsüz cihaz olarak kabul edilen durumlar
  return isLowCPU || isLowRAM || isSlowConnection || (isMobile && isTouchDevice);
};

// CSS class'ı ekle/çıkar
export const applyPerformanceMode = (): void => {
  if (isLowPerformanceDevice()) {
    document.documentElement.classList.add('low-performance');
  } else {
    document.documentElement.classList.remove('low-performance');
  }
};

// Performans modunu kontrol et
export const isPerformanceModeEnabled = (): boolean => {
  return document.documentElement.classList.contains('low-performance');
}; 