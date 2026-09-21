import React from 'react';

interface HemiUnoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  glow?: boolean;
  theme?: 'dark' | 'light';
  variant?: 'clean' | 'cards';
}

export const HemiUnoLogo: React.FC<HemiUnoLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  glow = true,
  theme = 'dark',
  variant = 'clean',
}) => {
  // Dimensions for emblem and full logo
  const emblemSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Hemi Uno Signature Emblem */}
      <div
        className={`relative ${emblemSizes} shrink-0 ${
          glow ? 'drop-shadow-[0_0_12px_rgba(255,70,0,0.5)]' : ''
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {variant === 'clean' ? (
            /* Clean Official Hemi Emblem (as seen in screenshot header and cards) */
            <g transform="translate(50, 50)">
              {/* Left Hemisphere */}
              <path
                d="M -4 -42 A 42 42 0 0 0 -4 42 L -4 16 A 16 16 0 0 1 -4 -16 Z"
                fill="#FF4600"
              />
              {/* Right Hemisphere */}
              <path
                d="M 4 -42 A 42 42 0 0 1 4 42 L 4 16 A 16 16 0 0 0 4 -16 Z"
                fill="#FF4600"
              />
            </g>
          ) : (
            <g transform="scale(0.5)">
              <path d="M 91 15 A 85 85 0 1 0 101 185 L 91 15 Z" fill="#FF4600" />
              <path d="M 103 15 A 85 85 0 1 1 113 185 L 103 15 Z" fill="#FF4600" />
              <g transform="translate(86, 100) rotate(-22)">
                <rect x="-20" y="-31" width="40" height="62" rx="5" ry="5" fill="#FFFFFF" stroke="#111318" strokeWidth="2.2" />
              </g>
              <g transform="translate(94, 100) rotate(-10)">
                <rect x="-20" y="-31" width="40" height="62" rx="5" ry="5" fill="#FFFFFF" stroke="#111318" strokeWidth="2.2" />
              </g>
              <g transform="translate(105, 100) rotate(10)">
                <rect x="-20" y="-31" width="40" height="62" rx="5" ry="5" fill="#11141A" stroke="#FFFFFF" strokeWidth="3" />
                <polygon points="0,-9.5 7.5,0 0,9.5 -7.5,0" fill="#FF4600" />
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Typography: "Hemi Uno" */}
      {showText && (
        <div className={`flex items-baseline font-black tracking-tight ${textSizes}`}>
          <span
            className={`font-black tracking-tight font-['Montserrat','Plus_Jakarta_Sans',sans-serif] ${
              theme === 'light' ? 'text-[#111318]' : 'text-white'
            } drop-shadow-sm`}
          >
            Hemi
          </span>
          <span className="text-[#FF4600] font-black tracking-tight ml-0.5 font-['Montserrat','Plus_Jakarta_Sans',sans-serif] drop-shadow-[0_0_12px_rgba(255,70,0,0.4)]">
            Uno
          </span>
        </div>
      )}
    </div>
  );
};
