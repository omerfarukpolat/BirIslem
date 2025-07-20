import React, { useEffect, useRef } from 'react';
import './Fireworks.css';

interface FireworksProps {
  isActive: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const Fireworks: React.FC<FireworksProps> = ({ isActive, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutlarını ayarla
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Havai fişek renkleri
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];

    // Yeni parçacık oluştur
    const createParticle = (x: number, y: number, color: string): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 0.5 + 0.5,
        color,
        size: Math.random() * 3 + 1
      };
    };

    // Havai fişek patlaması oluştur
    const createExplosion = (x: number, y: number) => {
      const particleCount = Math.floor(Math.random() * 30) + 20;
      const color = colors[Math.floor(Math.random() * colors.length)];

      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle(x, y, color));
      }
    };

    // Rastgele havai fişek oluştur
    const createRandomFirework = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.7; // Üst %70'te
      createExplosion(x, y);
    };

    // Başlangıç havai fişekleri
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        createRandomFirework();
      }, i * 200);
    }

    // Animasyon döngüsü
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Parçacıkları güncelle ve çiz
      particlesRef.current = particlesRef.current.filter(particle => {
        // Parçacığı güncelle
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Yerçekimi
        particle.life -= 0.02;

        // Parçacığı çiz
        if (particle.life > 0) {
          ctx.save();
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        return particle.life > 0;
      });

      // Yeni havai fişekler ekle
      if (Math.random() < 0.1 && particlesRef.current.length < 100) {
        createRandomFirework();
      }

      // Animasyonu devam ettir
      if (particlesRef.current.length > 0 || isActive) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fireworks-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
};

export default Fireworks;
