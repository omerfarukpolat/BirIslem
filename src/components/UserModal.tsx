import React, { useState } from 'react';
import './UserModal.css';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  user: {
    displayName: string;
    email: string;
    photoURL?: string;
  } | null;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSignOut, onSignIn, user }) => {
  const [avatarError, setAvatarError] = useState(false);

  // Avatar resim yükleme hatası durumunda
  const handleAvatarError = () => {
    console.log('UserModal: Avatar resmi yüklenemedi, placeholder gösteriliyor');
    setAvatarError(true);
  };

  // Avatar resim yükleme başarılı olduğunda
  const handleAvatarLoad = () => {
    console.log('UserModal: Avatar resmi başarıyla yüklendi');
    setAvatarError(false);
  };

  // Modal açıldığında avatar error state'ini sıfırla
  React.useEffect(() => {
    if (isOpen) {
      setAvatarError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="user-modal-overlay" onClick={onClose}>
      <div className="user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-modal-header">
          <h3>{user ? 'Kullanıcı Bilgileri' : 'Giriş Yap'}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="user-modal-content">
          <div className="user-avatar-large">
            {user?.photoURL && !avatarError ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'Kullanıcı'} 
                onError={handleAvatarError}
                onLoad={handleAvatarLoad}
              />
            ) : (
              <div className="avatar-placeholder-large">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          
          <div className="user-info-details">
            <div className="user-name-large">
              {user?.displayName || 'Giriş Yapılmamış'}
            </div>
            <div className="user-email-large">
              {user?.email || 'E-posta bilgisi yok'}
            </div>
          </div>
          
          <div className="user-modal-actions">
            {user ? (
              <button className="sign-out-button-large" onClick={onSignOut}>
                Çıkış Yap
              </button>
            ) : (
              <button className="sign-in-button-large" onClick={onSignIn}>
                Google ile Giriş Yap
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal; 