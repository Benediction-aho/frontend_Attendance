import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full' }) => {
  const sizes = { sm: 80, md: 160, lg: 240 };
  const imgSize = sizes[size];

  if (variant === 'icon') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          background: '#256ead',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 900,
          fontSize: 18,
          fontFamily: 'Roboto, Arial, sans-serif',
        }}>A</div>
        <span style={{ color: '#256ead', fontFamily: 'Roboto', fontWeight: 900, fontSize: 16 }}>
          AG
        </span>
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="Assistance Ghana - GIMA Services"
      style={{
        width: imgSize,
        height: 'auto',
        objectFit: 'contain',
      }}
    />
  );
};

export default Logo;
