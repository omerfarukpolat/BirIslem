import React, { useState, useEffect } from 'react';
import { isPerformanceModeEnabled, applyPerformanceMode } from '../utils/devicePerformance';

const PerformanceSettings: React.FC = () => {
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsPerformanceMode(isPerformanceModeEnabled());
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
  };

  return (
    <>
      {/* Performans Ayarları Butonu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: 'rgba(59, 130, 246, 0.9)',
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
          gap: '8px'
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
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
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