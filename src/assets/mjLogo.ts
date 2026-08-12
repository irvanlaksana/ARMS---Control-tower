export const DEFAULT_MJ_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="35%" stop-color="#eab308"/>
      <stop offset="70%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#991b1b"/>
    </linearGradient>
    <linearGradient id="darkRed" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>

  <!-- Outer Red Shield -->
  <path d="M 120 12 C 160 12, 215 35, 222 80 C 230 150, 180 225, 120 268 C 60 225, 10 150, 18 80 C 25 35, 80 12, 120 12 Z" fill="url(#darkRed)" />

  <!-- Outer Gold Shield Ribbon -->
  <path d="M 120 22 C 155 22, 202 42, 208 82 C 215 142, 172 210, 120 248 C 68 210, 25 142, 32 82 C 38 42, 85 22, 120 22 Z" fill="url(#gold)" />

  <!-- Middle Red Layer -->
  <path d="M 120 34 C 150 34, 190 52, 195 86 C 201 135, 162 196, 120 230 C 78 196, 39 135, 45 86 C 50 52, 90 34, 120 34 Z" fill="url(#red)" />

  <!-- Inner Gold Inset -->
  <path d="M 120 44 C 145 44, 178 60, 182 90 C 187 130, 153 182, 120 212 C 87 182, 53 130, 58 90 C 62 60, 95 44, 120 44 Z" fill="url(#gold)" opacity="0.9" />

  <!-- Inner White Canvas -->
  <path d="M 120 52 C 140 52, 170 66, 173 94 C 177 127, 147 172, 120 200 C 93 172, 63 127, 67 94 C 70 66, 100 52, 120 52 Z" fill="#ffffff" />

  <!-- Stylized 3D "M J" Monogram -->
  <g transform="translate(-1, -2)">
    <!-- Letter M -->
    <path d="M 78 178 L 78 98 L 95 98 L 108 142 L 121 98 L 138 98 L 138 178 L 123 178 L 123 128 L 112 165 L 104 165 L 93 128 L 93 178 Z" fill="url(#red)" />
    <!-- Letter J -->
    <path d="M 144 98 L 162 98 L 162 152 C 162 168, 153 178, 137 178 C 128 178, 122 173, 118 166 L 130 155 C 132 159, 134 162, 138 162 C 143 162, 146 151 Z" fill="url(#red)" />
  </g>
</svg>
`)}`;
