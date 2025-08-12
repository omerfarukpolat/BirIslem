// Güçsüz cihazları tespit etmek için utility fonksiyonları

// Tarayıcı tespiti
const detectBrowser = (): { name: string; isChrome: boolean; isSafari: boolean; isModern: boolean } => {
  const userAgent = navigator.userAgent;
  
  // Chrome tespiti
  const isChrome = /Chrome/.test(userAgent) && !/Edge|Edg/.test(userAgent);
  
  // Safari tespiti
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Edge|Edg/.test(userAgent);
  
  // Firefox tespiti
  const isFirefox = /Firefox/.test(userAgent);
  
  // Edge tespiti
  const isEdge = /Edge|Edg/.test(userAgent);
  
  // Opera tespiti
  const isOpera = /Opera|OPR/.test(userAgent);
  
  // Brave tespiti
  const isBrave = /Brave/.test(userAgent);
  
  // Samsung Internet tespiti
  const isSamsungInternet = /SamsungBrowser/.test(userAgent);
  
  // UC Browser tespiti
  const isUCBrowser = /UCBrowser/.test(userAgent);
  
  // Diğer tarayıcılar
  const isOther = !isChrome && !isSafari && !isFirefox && !isEdge && !isOpera && !isBrave && !isSamsungInternet && !isUCBrowser;
  
  // Modern tarayıcılar (Chrome, Safari, Firefox, Edge, Opera, Brave)
  const isModern = isChrome || isSafari || isFirefox || isEdge || isOpera || isBrave;
  
  let browserName = 'Unknown';
  if (isChrome) browserName = 'Chrome';
  else if (isSafari) browserName = 'Safari';
  else if (isFirefox) browserName = 'Firefox';
  else if (isEdge) browserName = 'Edge';
  else if (isOpera) browserName = 'Opera';
  else if (isBrave) browserName = 'Brave';
  else if (isSamsungInternet) browserName = 'Samsung Internet';
  else if (isUCBrowser) browserName = 'UC Browser';
  else if (isOther) browserName = 'Other';
  
  return {
    name: browserName,
    isChrome,
    isSafari,
    isModern
  };
};

// Android cihaz tespiti
const isAndroidDevice = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

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
  
  // Tarayıcı tespiti
  const browser = detectBrowser();
  
  // Android cihaz tespiti
  const isAndroid = isAndroidDevice();
  
  // Düşük performans kriterleri
  const isLowCPU = cpuCores <= 2;
  const isLowRAM = deviceMemory <= 2;
  
  // Güçsüz cihaz olarak kabul edilen durumlar
  const isLowPerformance = isLowCPU || isLowRAM || isSlowConnection || (isMobile && isTouchDevice);
  
  // Tarayıcı bazlı performans modu
  const needsBrowserOptimization = !browser.isModern || isAndroid;
  
  // Toplam performans değerlendirmesi
  return isLowPerformance || needsBrowserOptimization;
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

// Tarayıcı bilgilerini döndür (debug için)
export const getBrowserInfo = () => {
  return detectBrowser();
};

// Cihaz bilgilerini döndür (debug için)
export const getDeviceInfo = () => {
  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    onTouchStart: 'ontouchstart' in window,
    connection: (navigator as any).connection?.effectiveType || 'unknown',
    isAndroid: isAndroidDevice(),
    browser: detectBrowser()
  };
}; 