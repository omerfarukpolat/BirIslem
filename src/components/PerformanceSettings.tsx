import React, { useState, useEffect } from 'react';
import { isPerformanceModeEnabled, applyPerformanceMode, getDeviceInfo } from '../utils/devicePerformance';

const PerformanceSettings: React.FC = () => {
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    setIsPerformanceMode(isPerformanceModeEnabled());
    setDeviceInfo(getDeviceInfo());
  }, []);

  const togglePerformanceMode = () => {
    if (isPerformanceMode) {
      document.documentElement.classList.remove('low-performance');
      setIsPerformanceMode(false);
    } else {
      document.documentElement.classList.add('low-performance');
      setIsPerformanceMode(true);
    }
  };

  const resetToAuto = () => {
    applyPerformanceMode();
    setIsPerformanceMode(isPerformanceModeEnabled());
    setDeviceInfo(getDeviceInfo());
  };

  // Performans modunun neden aktif olduğunu belirle
  const getPerformanceReason = () => {
    if (!isPerformanceMode) return null;
    
    const reasons = [];
    
    if (deviceInfo.hardwareConcurrency <= 2) reasons.push('Düşük CPU (≤2 çekirdek)');
    if (deviceInfo.deviceMemory <= 2) reasons.push('Düşük RAM (≤2GB)');
    if (deviceInfo.connection === '2g' || deviceInfo.connection === '3g') reasons.push('Yavaş bağlantı');
    if (deviceInfo.isAndroid) reasons.push('Android cihaz');
    if (deviceInfo.browser && !deviceInfo.browser.isModern) reasons.push('Eski tarayıcı');
    
    return reasons.length > 0 ? reasons.join(', ') : 'Otomatik algılandı';
  };

  const performanceReason = getPerformanceReason();

  return (
    <>
      {/* Performans Ayarları Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: isPerformanceMode ? 'rgba(34, 197, 94, 0.9)' : 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 20px',
          fontSize: '14px',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease'
        }}
        title="Performans Ayarları"
      >
        🚀 {isPerformanceMode ? 'Hızlı Mod' : 'Normal Mod'}
      </button>

      {/* Performans Ayarları Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
              🚀 Performans Ayarları
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
                Oyun performansını optimize etmek için ayarları değiştirebilirsiniz.
              </p>
            </div>

            {/* Mevcut Durum */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              background: isPerformanceMode ? '#f0fdf4' : '#fef3c7',
              border: `1px solid ${isPerformanceMode ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: isPerformanceMode ? '#059669' : '#d97706' }}>
                {isPerformanceMode ? '✅ Hızlı Mod Aktif' : '⚡ Normal Mod Aktif'}
              </div>
              {performanceReason && (
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  <strong>Neden:</strong> {performanceReason}
                </div>
              )}
            </div>

            {/* Cihaz Bilgileri */}
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px', 
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#475569' }}>
                📱 Cihaz Bilgileri
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div>CPU: {deviceInfo.hardwareConcurrency || 'N/A'} çekirdek</div>
                <div>RAM: {deviceInfo.deviceMemory || 'N/A'}GB</div>
                <div>Tarayıcı: {deviceInfo.browser?.name || 'N/A'}</div>
                <div>Android: {deviceInfo.isAndroid ? 'Evet' : 'Hayır'}</div>
                <div>Touch: {deviceInfo.onTouchStart ? 'Evet' : 'Hayır'}</div>
                <div>Bağlantı: {deviceInfo.connection}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  checked={isPerformanceMode}
                  onChange={togglePerformanceMode}
                  style={{ width: '18px', height: '18px' }}
                />
                <span>Hızlı Mod (Animasyonları Kapat)</span>
              </label>
              
              <p style={{ margin: '0', fontSize: '12px', color: '#9ca3af' }}>
                Hızlı mod, tüm animasyonları kapatarak performansı artırır.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={resetToAuto}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Otomatik Algıla
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginLeft: 'auto'
                }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PerformanceSettings; 