import React, { useState, useEffect } from 'react';
import { isLowPerformanceDevice, isPerformanceModeEnabled } from '../utils/devicePerformance';

const PerformanceDebug: React.FC = () => {
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    const checkPerformance = () => {
      const lowPerf = isLowPerformanceDevice();
      const perfMode = isPerformanceModeEnabled();
      
      setIsLowPerformance(lowPerf);
      setIsPerformanceMode(perfMode);
      
      // Cihaz bilgilerini topla
      setDeviceInfo({
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        onTouchStart: 'ontouchstart' in window,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      });
    };

    checkPerformance();
    
    // Her 2 saniyede bir kontrol et
    const interval = setInterval(checkPerformance, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Sadece development modunda göster
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🚀 Performans Debug
      </div>
      <div>Düşük Performans: {isLowPerformance ? '✅' : '❌'}</div>
      <div>Performans Modu: {isPerformanceMode ? '✅' : '❌'}</div>
      <div style={{ marginTop: '10px', fontSize: '10px' }}>
        <div>CPU: {deviceInfo.hardwareConcurrency || 'N/A'}</div>
        <div>RAM: {deviceInfo.deviceMemory || 'N/A'}GB</div>
        <div>Touch: {deviceInfo.onTouchStart ? '✅' : '❌'}</div>
        <div>Connection: {deviceInfo.connection}</div>
      </div>
    </div>
  );
};

export default PerformanceDebug; 