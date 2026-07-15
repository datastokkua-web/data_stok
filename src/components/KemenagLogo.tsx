import React from "react";

interface KemenagLogoProps {
  className?: string;
  size?: number;
}

export const KemenagLogo: React.FC<KemenagLogoProps> = ({ className = "", size = 80 }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} id="kemenag-logo-wrapper">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(212,175,55,0.3)] animate-pulse-slow"
        id="kemenag-svg"
      >
        {/* Outer Circle with Gold Border */}
        <circle cx="100" cy="100" r="92" stroke="#D4AF37" strokeWidth="4" fill="#111827" />
        <circle cx="100" cy="100" r="85" stroke="#D4AF37" strokeWidth="1" strokeDasharray="4 4" />

        {/* Inner Green Shield Accent */}
        <path
          d="M100 25 C135 25, 160 35, 160 70 C160 120, 100 165, 100 165 C100 165, 40 120, 40 70 C40 35, 65 25, 100 25 Z"
          fill="#1E293B"
          stroke="#D4AF37"
          strokeWidth="2"
        />

        {/* Scaled/Balance Silhouette (Keadilan) */}
        <line x1="100" y1="55" x2="100" y2="120" stroke="#D4AF37" strokeWidth="3" />
        <line x1="65" y1="70" x2="135" y2="70" stroke="#D4AF37" strokeWidth="3" />
        
        {/* Left pan */}
        <line x1="65" y1="70" x2="55" y2="95" stroke="#D4AF37" strokeWidth="1.5" />
        <line x1="65" y1="70" x2="75" y2="95" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M50 95 C50 102, 80 102, 80 95 Z" fill="#D4AF37" opacity="0.8" />

        {/* Right pan */}
        <line x1="135" y1="70" x2="125" y2="95" stroke="#D4AF37" strokeWidth="1.5" />
        <line x1="135" y1="70" x2="145" y2="95" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M120 95 C120 102, 150 102, 150 95 Z" fill="#D4AF37" opacity="0.8" />

        {/* Center Golden Star */}
        <path
          d="M100 35 L104 46 L116 46 L106 53 L110 65 L100 58 L90 65 L94 53 L84 46 L96 46 Z"
          fill="#FFD700"
          stroke="#B8860B"
          strokeWidth="1"
        />

        {/* Holy Book / Scripture (Al-Qur'an / Kitab Suci) */}
        <path
          d="M100 115 L65 130 C75 125, 90 125, 100 115 Z"
          fill="#FFD700"
          stroke="#B8860B"
          strokeWidth="1"
        />
        <path
          d="M100 115 L135 130 C125 125, 110 125, 100 115 Z"
          fill="#FFD700"
          stroke="#B8860B"
          strokeWidth="1"
        />
        <path
          d="M65 130 L100 142 L135 130 C120 135, 80 135, 65 130 Z"
          fill="#D4AF37"
        />

        {/* Ribbon for Motto */}
        <path
          d="M55 155 Q100 168 145 155 L140 167 Q100 178 60 167 Z"
          fill="#D4AF37"
          stroke="#B8860B"
          strokeWidth="1"
        />

        {/* Text "IKHLAS BERAMAL" */}
        <path id="ribbonPath" d="M60 162 Q100 173 140 162" fill="none" />
        <text fontFamily="Inter, sans-serif" fontSize="8" fontWeight="bold" fill="#111827" textAnchor="middle">
          <textPath href="#ribbonPath" startOffset="50%">
            IKHLAS BERAMAL
          </textPath>
        </text>
      </svg>
      <span className="text-amber-400 font-bold tracking-wider text-sm mt-3 uppercase" id="kemenag-label">
        Kementerian Agama
      </span>
      <span className="text-gray-400 text-xs text-center" id="kemenag-sublabel">
        Kabupaten Tangerang
      </span>
    </div>
  );
};
