import React, { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager } from '../utils/soundEffects';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GameSettings) => void;
  currentSettings: GameSettings;
}

export interface GameSettings {
  timeLimit: number; // saniye cinsinden
  operationLimit: number; // 0 = sınırsız, 4-10 arası
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.getSoundEnabled());
  const settingsRef = useRef<GameSettings>(currentSettings);

  // Ses durumunu localStorage'dan yükle
  useEffect(() => {
    const currentSoundState = soundManager.getSoundEnabled();
    setSoundEnabled(currentSoundState);
    console.log('SettingsModal: Ses durumu yüklendi:', currentSoundState);
  }, []);

  const handleTimeChange = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, timeLimit: value }));
  }, []);

  const handleOperationLimitChange = useCallback((value: number) => {
    // State'i doğrudan güncelle
    const newSettings = {
      ...settingsRef.current,
      operationLimit: value
    };
    setSettings(newSettings);
  }, []);

  // Ses açma/kapama
  const handleSoundToggle = () => {
    const newSoundState = soundManager.toggleSound();
    setSoundEnabled(newSoundState);
  };

  // Süre seçenekleri (saniye cinsinden)
  const timeOptions = [
    { value: 30, label: '30 saniye' },
    { value: 45, label: '45 saniye' },
    { value: 60, label: '60 saniye' },
    { value: 90, label: '90 saniye' },
    { value: 120, label: '120 saniye' },
    { value: 180, label: '180 saniye' },
    { value: 240, label: '4 dakika' },
    { value: 300, label: '5 dakika' }
  ];

  // İşlem sınırı seçenekleri
  const operationLimitOptions = [
    { value: 0, label: 'Sınırsız' },
    { value: 1, label: '1 işlem' },
    { value: 2, label: '2 işlem' },
    { value: 3, label: '3 işlem' },
    { value: 4, label: '4 işlem' },
    { value: 5, label: '5 işlem' },
  ];

  useEffect(() => {
    if (isOpen) {
      setSettings(currentSettings);
      settingsRef.current = currentSettings;
      setHasChanges(false);
    }
  }, [isOpen, currentSettings]);

  useEffect(() => {
    settingsRef.current = settings;
    const changed = 
      settings.timeLimit !== currentSettings.timeLimit ||
      settings.operationLimit !== currentSettings.operationLimit;
    setHasChanges(changed);
  }, [settings, currentSettings]);

  const handleSave = useCallback(() => {
    onSave(settings);
    onClose();
  }, [onSave, settings, onClose]);

  const handleCancel = useCallback(() => {
    setSettings(currentSettings);
    settingsRef.current = currentSettings;
    setHasChanges(false);
    onClose();
  }, [currentSettings, onClose]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} saniye`;
    if (secs === 0) return `${mins} dakika`;
    return `${mins}:${secs.toString().padStart(2, '0')} dakika`;
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Oyun Ayarları</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Süre Ayarı */}
          <div className="setting-section">
            <div className="setting-header">
              <h3 className="setting-title">Oyun Süresi</h3>
              <div className="current-value">
                {formatTime(settings.timeLimit)}
              </div>
            </div>
            
            <div className="time-selector">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  className={`time-option ${settings.timeLimit === option.value ? 'selected' : ''}`}
                  onClick={() => handleTimeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* İşlem Sınırı Ayarı */}
          <div className="setting-section">
            <div className="setting-header">
              <h3 className="setting-title">İşlem Sınırı</h3>
              <div className="current-value">
                {settings.operationLimit === 0 ? 'Sınırsız' : `${settings.operationLimit} işlem`}
              </div>
            </div>
            
            <div className="operation-limit-selector">
              {operationLimitOptions.map((option) => {
                const isSelected = settings.operationLimit === option.value;
                return (
                  <button
                    key={option.value}
                    className={`operation-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      handleOperationLimitChange(option.value);
                    }}
                    style={{
                      backgroundColor: isSelected ? '#0891b2' : 'transparent',
                      color: isSelected ? 'white' : '#475569',
                      borderColor: isSelected ? '#0891b2' : 'rgba(148, 163, 184, 0.2)'
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ses Ayarları */}
          <div className="setting-section">
            <div className="setting-header">
              <h3 className="setting-title">Ses Efektleri</h3>
              <div className="current-value">
                {soundEnabled ? 'Açık' : 'Kapalı'}
              </div>
            </div>
            
            <div className="sound-toggle">
              <button
                className={`sound-toggle-button ${soundEnabled ? 'enabled' : 'disabled'}`}
                onClick={handleSoundToggle}
              >
                <span className="sound-icon">
                  {soundEnabled ? '🔊' : '🔇'}
                </span>
                <span className="sound-text">
                  {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
                </span>
              </button>
            </div>
            
            <div className="setting-description">
              <p>Ses tercihiniz tarayıcınızda kaydedilir ve sonraki ziyaretlerinizde hatırlanır.</p>
            </div>
          </div>

          {/* Bilgi Notu */}
          <div className="info-note">
            <div className="info-icon">ℹ️</div>
            <p>
              Ayarları değiştirdiğinizde oyun sıfırlanacak ve yeni ayarlarla başlayacaktır.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={handleCancel}
          >
            İptal
          </button>
          <button 
            className={`save-button ${!hasChanges ? 'disabled' : ''}`}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 