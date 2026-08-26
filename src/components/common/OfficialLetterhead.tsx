import React from 'react';

interface OfficialLetterheadProps {
  customLogo?: string;
  className?: string;
}

export const OfficialLetterhead: React.FC<OfficialLetterheadProps> = ({ className = '' }) => {
  return (
    <div className={`w-full select-none ${className}`}>
      {/* 
        We use the uploaded image as the letterhead. 
        The user should upload 'kop-surat.jpg' to the 'public' directory. 
      */}
      <img 
        src="/kop-surat.jpg" 
        alt="Kop Surat PT Mitra Jasatria Indonesia" 
        className="w-full h-auto object-contain"
        onError={(e) => {
          // Fallback if the image is not yet uploaded to the public folder
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.nextElementSibling) {
            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
          }
        }}
      />
      
      {/* Fallback layout just in case the image is not found */}
      <div className="hidden">
        <div className="flex items-center gap-5 sm:gap-6 pb-2">
          {/* Official Shield Logo */}
          <div className="shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 160 180"
              className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-sm"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Golden Shield Frame */}
              <path
                d="M80 8 L146 36 V92 C146 136 118 165 80 176 C42 165 14 136 14 92 V36 L80 8 Z"
                fill="#C99738"
                stroke="#997020"
                strokeWidth="2"
              />
              {/* Inner Shield Golden Bevel */}
              <path
                d="M80 14 L140 39 V90 C140 130 114 157 80 168 C46 157 20 130 20 90 V39 L80 14 Z"
                fill="#F3CD67"
              />
              {/* Red Shield Body */}
              <path
                d="M80 20 L134 43 V88 C134 125 110 150 80 160 C50 150 26 125 26 88 V43 L80 20 Z"
                fill="#B91C1C"
              />
              {/* Inner Red Bevel Contour */}
              <path
                d="M80 26 L128 47 V86 C128 120 106 143 80 152 C54 143 32 120 32 86 V47 L80 26 Z"
                fill="#991B1B"
              />
              {/* Golden Inner Border */}
              <path
                d="M80 32 L122 51 V84 C122 115 102 136 80 144 C58 136 38 115 38 84 V51 L80 32 Z"
                stroke="#FDE68A"
                strokeWidth="2.5"
                fill="#7F1D1D"
              />
              
              {/* Stylized 'M' Monogram */}
              <path
                d="M48 115 V62 H56 L71 96 L86 62 H94 V115 H84 V78 L72 105 H68 L56 78 V115 H48 Z"
                fill="#FFFFFF"
                opacity="0.15"
              />
              
              {/* Red & Gold Center Emblem (MJ Monogram) */}
              <g id="monogram" transform="translate(42, 54)">
                {/* Stylized Letter M */}
                <path
                  d="M4 56 V10 L16 38 L28 10 V56 H20 V25 L16 36 L12 25 V56 H4 Z"
                  fill="#FDE047"
                  stroke="#991B1B"
                  strokeWidth="1.5"
                />
                {/* Stylized Letter J */}
                <path
                  d="M44 10 H52 V46 C52 54 46 58 37 58 C28 58 23 54 22 47 L30 46 C31 49 33 51 37 51 C41 51 44 49 44 45 V10 Z"
                  fill="#DC2626"
                  stroke="#FDE047"
                  strokeWidth="2"
                />
                {/* Bold Red Front 'M' */}
                <path
                  d="M6 54 V12 L17 38 L28 12 V54 H22 V24 L17 35 L12 24 V54 H6 Z"
                  fill="#B91C1C"
                />
                {/* Bold Red Front 'J' */}
                <path
                  d="M45 12 H51 V45 C51 52 46 56 38 56 C30 56 25 52 24 46 L29 45 C30 48 33 50 38 50 C42 50 45 48 45 44 V12 Z"
                  fill="#DC2626"
                />
              </g>
            </svg>
          </div>
          {/* Company Header Typography */}
          <div className="flex-1 text-left">
            <h1
              className="text-lg sm:text-2xl font-black uppercase tracking-wider text-slate-950 leading-tight"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
            >
              PT. MITRA JASATRIA INDONESIA
            </h1>
            <p
              className="text-xs sm:text-sm font-bold text-red-700 mt-1 leading-tight tracking-wide"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
            >
              Nomor AHU-056731.AH.01.01
            </p>
            <div
              className="text-xs sm:text-sm font-bold text-slate-900 mt-1 space-y-0.5 leading-snug"
              style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
            >
              <p>JL. Menteri Supeno No. 07, Sokaraja Tengah,</p>
              <p>Banyumas, Jawa Tengah, 53181</p>
            </div>
          </div>
        </div>
        {/* Double Horizontal Separator Rule (Thick top, thin bottom) */}
        <div className="w-full pt-1 pb-1">
          <div className="border-b-[3px] border-black w-full" />
          <div className="border-b-[1px] border-black w-full mt-[2px]" />
        </div>
      </div>
    </div>
  );
};

