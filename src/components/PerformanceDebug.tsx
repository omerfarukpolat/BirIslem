import React, { useState, useEffect } from 'react';
import { isLowPerformanceDevice, isPerformanceModeEnabled, getDeviceInfo } from '../utils/devicePerformance';

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
      setDeviceInfo(getDeviceInfo());
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
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '350px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#60a5fa' }}>
        🚀 Performans Debug
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div>Düşük Performans: {isLowPerformance ? '✅' : '❌'}</div>
        <div>Performans Modu: {isPerformanceMode ? '✅' : '❌'}</div>
      </div>
      
      <div style={{ 
        marginTop: '12px', 
        fontSize: '11px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        paddingTop: '8px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#34d399' }}>
          📱 Cihaz Bilgileri:
        </div>
        <div>CPU: {deviceInfo.hardwareConcurrency || 'N/A'}</div>
        <div>RAM: {deviceInfo.deviceMemory || 'N/A'}GB</div>
        <div>Touch: {deviceInfo.onTouchStart ? '✅' : '❌'}</div>
        <div>Connection: {deviceInfo.connection}</div>
        <div>Android: {deviceInfo.isAndroid ? '✅' : '❌'}</div>
      </div>
      
      <div style={{ 
        marginTop: '8px', 
        fontSize: '11px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        paddingTop: '8px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#fbbf24' }}>
          🌐 Tarayıcı:
        </div>
        <div>Name: {deviceInfo.browser?.name || 'N/A'}</div>
        <div>Modern: {deviceInfo.browser?.isModern ? '✅' : '❌'}</div>
        <div>Chrome: {deviceInfo.browser?.isChrome ? '✅' : '❌'}</div>
        <div>Safari: {deviceInfo.browser?.isSafari ? '✅' : '❌'}</div>
      </div>
    </div>
  );
};

export default PerformanceDebug; 