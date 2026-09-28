export interface VehicleBrandGroup {
  category: string;
  brands: string[];
}

export const VEHICLE_BRAND_GROUPS: VehicleBrandGroup[] = [
  {
    category: 'SEPEDA MOTOR (RODA DUA)',
    brands: [
      'HONDA',
      'YAMAHA',
      'SUZUKI',
      'KAWASAKI',
      'VESPA',
      'PIAGGIO',
      'TVS',
      'BENELLI',
      'VIAR',
      'GESITS',
      'ALVA',
      'POLYTRON',
      'KTM',
      'ROYAL ENFIELD'
    ]
  },
  {
    category: 'MOBIL PENUMPANG (RODA EMPAT)',
    brands: [
      'TOYOTA',
      'DAIHATSU',
      'HONDA',
      'MITSUBISHI',
      'SUZUKI',
      'HYUNDAI',
      'WULING',
      'NISSAN',
      'MAZDA',
      'CHERY',
      'MG',
      'KIA',
      'FORD',
      'CHEVROLET',
      'BMW',
      'MERCEDES-BENZ',
      'ISUZU'
    ]
  },
  {
    category: 'KENDARAAN NIAGA, PICK UP & TRUK',
    brands: [
      'MITSUBISHI FUSO',
      'HINO',
      'ISUZU',
      'DAIHATSU GRAN MAX',
      'SUZUKI CARRY',
      'TOYOTA DYNA',
      'TATA',
      'VIAR KARYA'
    ]
  }
];

export const POPULAR_VEHICLE_MODELS: Record<string, string[]> = {
  // HONDA MOTOR & MOBIL
  'HONDA': [
    // Motor
    'BEAT ESP / DELUXE',
    'BEAT STREET',
    'VARIO 125',
    'VARIO 160',
    'SCOOPY PRESTIGE / SPORTY',
    'PCX 160',
    'ADV 160',
    'GENIO',
    'STYLO 160',
    'REVO X / FIT',
    'SUPRA X 125',
    'GTR 150',
    'CB150R STREETFIRE',
    'CB150X',
    'CBR150R',
    'CRF 150L',
    'FORZA 250',
    // Mobil
    'BRIO SATYA / RS',
    'HR-V 1.5 E / SE',
    'HR-V 1.5 TURBO RS',
    'CR-V 1.5 TURBO / HYBRID',
    'BR-V PRESTIGE',
    'WR-V RS',
    'MOBILIO E / RS',
    'JAZZ RS / S',
    'CITY HATCHBACK RS',
    'CIVIC RS TURBO'
  ],

  // YAMAHA
  'YAMAHA': [
    'NMAX 155 CONNECTED',
    'NMAX TURBO',
    'AEROX 155 CONNECTED',
    'FAZZIO LUX / NEO',
    'GRAND FILANO HYBRID',
    'MIO M3 125',
    'GEAR 125',
    'FREEGO 125',
    'LEXI LX 155',
    'XMAX 250 CONNECTED',
    'JUPITER Z1',
    'MX KING 150',
    'VIXION 150 / R',
    'XSR 155',
    'WR 155 R',
    'R15 V4 / CONNECTED',
    'MT-15',
    'MT-25'
  ],

  // SUZUKI
  'SUZUKI': [
    // Motor
    'SATRIA F150 FI',
    'NEX II',
    'ADDRESS FI',
    'BURGMAN STREET 125EX',
    'GSX-R150',
    'GSX-S150',
    'SMASH FI',
    // Mobil
    'CARRY PICK UP 1.5',
    'ALL NEW ERTIGA HYBRID',
    'XL7 ZETA / BETA / ALPHA',
    'JIMNY 3-DOOR / 5-DOOR',
    'IGNIS GX / GL',
    'BALENO HATCHBACK',
    'S-PRESSO',
    'GRAND VITARA HYBRID',
    'APV ARENA'
  ],

  // KAWASAKI
  'KAWASAKI': [
    'KLX 150 / S / SM',
    'KLX 230',
    'D-TRACKER 150',
    'NINJA 250 FI / ABS',
    'NINJA ZX-25R',
    'W175 / CAFE / TR',
    'VULCAN S 650',
    'VERSYS-X 250'
  ],

  // VESPA & PIAGGIO
  'VESPA': [
    'SPRINT 150 I-GET ABS',
    'PRIMAVERA 150 I-GET ABS',
    'GTS 150 SUPER SPORT',
    'GTS 300 HPE',
    'S 125 I-GET',
    'LX 125 I-GET'
  ],
  'PIAGGIO': [
    'MEDLEY S 150 I-GET',
    'BEVERLY 400',
    'MP3 500 HPE SPORT'
  ],

  // TOYOTA
  'TOYOTA': [
    'ALL NEW AVANZA 1.3 / 1.5 G',
    'ALL NEW VELOZ 1.5 Q CVT',
    'INNOVA REBORN DIESEL 2.4 G / V',
    'INNOVA ZENIX G / V / Q HYBRID',
    'CALYA 1.2 G / E',
    'ALL NEW RUSH 1.5 S TRD / GR SPORT',
    'FORTUNER 2.4 / 2.8 VRZ GR SPORT',
    'ALL NEW AGYA 1.2 G / GR SPORT',
    'YARIS 1.5 S GR SPORT',
    'RAIZE 1.0 TURBO / 1.2 G',
    'COROLLA CROSS HYBRID',
    'HILUX SINGLE CABIN / DOUBLE CABIN',
    'HIACE COMMUTER / PREMIO',
    'VOXY 2.0 AT'
  ],

  // DAIHATSU
  'DAIHATSU': [
    'ALL NEW XENIA 1.3 / 1.5 R',
    'SIGRA 1.0 / 1.2 R DLX',
    'ALL NEW TERIOS R CUSTOM / DLX',
    'ALL NEW AYLA 1.0 / 1.2 R',
    'GRAN MAX PICK UP 1.3 / 1.5 AC PS',
    'GRAN MAX MINIBUS / BLIND VAN',
    'ROCKY 1.0 TURBO / 1.2 X',
    'LUXIO 1.5 X / D'
  ],

  // MITSUBISHI
  'MITSUBISHI': [
    'XPANDER ULTIMATE / SPORT / EXCEED',
    'XPANDER CROSS PREMIUM PACKAGE',
    'PAJERO SPORT DAKAR 4X2 / 4X4',
    'PAJERO SPORT EXCEED',
    'L300 PICK UP EURO 4',
    'TRITON ULTIMATE / HDX 4X4',
    'XFORCE ULTIMATE / EXCEED',
    'COLT DIESEL CANTER FE 74 HD',
    'CANTER FE 71',
    'FUSO FIGHTER'
  ],

  // ISUZU
  'ISUZU': [
    'TRAGA PICK UP / BOX',
    'PANTHER TOURING / GRAND TOURING',
    'PANTHER LS / LV',
    'ELF NLR 55 / NMR 71',
    'D-MAX 1.9 / 3.0 4X4',
    'MU-X 4X4',
    'GIGA FVR / GVR'
  ],

  // HYUNDAI
  'HYUNDAI': [
    'CRETA PRIME / STYLE / TREND',
    'STARGAZER PRIME / ESSENTIAL',
    'STARGAZER X PRIME',
    'IONIQ 5 SIGNATURE',
    'SANTA FE DIESEL / HYBRID',
    'PALISADE SIGNATURE AWD'
  ],

  // WULING
  'WULING': [
    'CONFERO S 1.5',
    'CORTEZ 1.5 TURBO',
    'ALMAZ RS PRO',
    'AIR EV LONG RANGE / STANDARD',
    'BINGUO EV 410 KM',
    'FORMO BLIND VAN / MAX PICK UP'
  ],

  // NISSAN
  'NISSAN': [
    'ALL NEW LIVINA VE / VL',
    'GRAND LIVINA 1.5 SV / XV',
    'SERENA C26 / C27 HWS',
    'X-TRAIL 2.5 AT',
    'MAGNITE PREMIUM',
    'MARCH 1.2'
  ],

  // HINO
  'HINO': [
    'DUTRO 130 HD / MD',
    'DUTRO 110 SD / LD',
    'RANGER FL / FM 260 TI'
  ],

  // VIAR
  'VIAR': [
    'KARYA 150 RODA 3',
    'KARYA 200 RODA 3',
    'CROSS X 150',
    'CROSS X 200',
    'Q1 MOTOR LISTRIK'
  ],

  // MOTOR LISTRIK & LAINNYA
  'GESITS': ['GESITS G1', 'GESITS RAYA'],
  'ALVA': ['ALVA ONE', 'ALVA CERVO'],
  'POLYTRON': ['FOX R', 'FOX S'],
  'TVS': ['CALLISTO 110', 'RONIN 225', 'NTORQ 125'],
  'BENELLI': ['MOTOBI 200 EVO', 'PANAREA 125', 'PATAGONIAN EAGLE 250']
};
