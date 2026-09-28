import React, { useState, useRef } from 'react';
import { Personnel, AppSettings } from '../../types/arms';
import { DEFAULT_MJ_LOGO } from '../../assets/mjLogo';
import {
  Download,
  Printer,
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Camera,
  CheckCircle,
  Sparkles,
  Layers,
  ExternalLink,
  RefreshCw,
  Award
} from 'lucide-react';

interface EmployeeIdCardModalProps {
  personnel: Personnel;
  settings?: AppSettings;
  isOpen?: boolean;
  companyName?: string;
  companyLogo?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  onClose: () => void;
  onUpdatePersonnelPhoto?: (personnelId: string, newPhotoUrl: string) => void;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  personnel,
  settings,
  companyName: propCompanyName,
  companyLogo: propCompanyLogo,
  companyAddress: propCompanyAddress,
  companyPhone: propCompanyPhone,
  companyEmail: propCompanyEmail,
  onClose,
  onUpdatePersonnelPhoto,
}) => {
  const [viewMode, setViewMode] = useState<'FRONT' | 'BACK' | 'BOTH'>('BOTH');
  const [isDownloading, setIsDownloading] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string>(personnel.ktpPhotoUrl || '');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const bothCardsRef = useRef<HTMLDivElement>(null);

  // Dynamic values synchronized with Settings
  const companyName = propCompanyName || settings?.companyName || 'PT MJ Agency Recovery Indonesia';
  const companyLogo = propCompanyLogo || settings?.companyLogo || DEFAULT_MJ_LOGO;
  const companyAddress = propCompanyAddress || settings?.companyAddress || 'Gedung Wisma Antara Lt. 12, Jl. Medan Merdeka Selatan No. 17, Jakarta Pusat';
  const companyPhone = propCompanyPhone || settings?.companyPhone || '+62 21 384 9900 / 0812-8888-2929';
  const companyEmail = propCompanyEmail || settings?.companyEmail || 'recovery@mjt-agency.co.id';

  // Extract city for issuance statement
  const getCityFromAddress = (addr: string): string => {
    if (!addr) return 'Jakarta Pusat';
    const clean = addr.replace(/Indonesia/gi, '').trim();
    const parts = clean.split(/,|\n/);
    if (parts.length >= 2) {
      const candidate = parts[parts.length - 2].trim().replace(/\b\d{5}\b/g, '').trim();
      if (candidate.length >= 3) return candidate;
    }
    const last = parts[parts.length - 1].trim().replace(/\b\d{5}\b/g, '').trim();
    return last.length >= 3 ? last : 'Jakarta';
  };
  const issueCity = getCityFromAddress(companyAddress);

  // Derive acronym for ID code
  const companyAcronym = companyName
    .replace(/PT\.?|CV\.?|TBK\.?/gi, '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'ARMS';

  const isKaryawan = personnel.type === 'KARYAWAN';
  const cardTypeTitle = isKaryawan ? 'OFFICIAL EMPLOYEE ID PASS' : 'FIELD EXECUTOR BADGE';
  const cardTypeSubtitle = isKaryawan ? 'KARYAWAN INTERNAL OPERASIONAL' : 'MITRA DC & ASSET RECOVERY';
  const formattedId = personnel.id.startsWith('EMP') || personnel.id.startsWith('MITRA') 
    ? personnel.id 
    : `${companyAcronym}-${isKaryawan ? 'EMP' : 'FLD'}-${personnel.id.replace(/[^0-9]/g, '').slice(-4) || '2026'}`;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomPhoto(result);
          if (onUpdatePersonnelPhoto) {
            onUpdatePersonnelPhoto(personnel.id, result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Helper to load an image into an HTMLImageElement promise
   */
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 30)}...`));
      img.src = src;
    });
  };

  /**
   * Pure Canvas 2D Generator Engine (Red & Gold Royal Edition)
   * Draws ultra high-definition (300 DPI) cards with zero CSS dependency issues
   */
  const generateCanvasCard = async (target: 'FRONT' | 'BACK' | 'BOTH'): Promise<string> => {
    const CARD_WIDTH = 960;
    const CARD_HEIGHT = 1500;
    const CORNER_RADIUS = 48;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    if (target === 'BOTH') {
      canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH * 2 + 160;
      canvas.height = CARD_HEIGHT + 170;
      ctx = canvas.getContext('2d')!;
      
      // Sheet background: luxury dark obsidian
      ctx.fillStyle = '#060102';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Sheet header in gold
      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${companyName.toUpperCase()} — LEMBAR CETAK RESMI ID CARD (STANDAR CR80 LANYARD)`, canvas.width / 2, 52);

      // Gold hairline divider under header
      const goldGrad = ctx.createLinearGradient(100, 0, canvas.width - 100, 0);
      goldGrad.addColorStop(0, '#78350f');
      goldGrad.addColorStop(0.5, '#fef08a');
      goldGrad.addColorStop(1, '#78350f');
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(120, 68);
      ctx.lineTo(canvas.width - 120, 68);
      ctx.stroke();

      // Draw Front Card at (60, 95)
      await drawFrontCard(ctx, 60, 95, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);

      // Draw Back Card at (CARD_WIDTH + 100, 95)
      await drawBackCard(ctx, CARD_WIDTH + 100, 95, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
    } else if (target === 'FRONT') {
      canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      ctx = canvas.getContext('2d')!;
      await drawFrontCard(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH;
      canvas.height = CARD_HEIGHT;
      ctx = canvas.getContext('2d')!;
      await drawBackCard(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
    }

    return canvas.toDataURL('image/png', 1.0);
  };

  /**
   * Draws the Front of the ID Card in Red & Gold Luxury Palette
   */
  const drawFrontCard = async (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.save();
    // Clip rounded rectangle for card
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();

    // 1. Deep Burgundy-Obsidian Base Background
    const bgGrad = ctx.createRadialGradient(x + w / 2, y + 360, 40, x + w / 2, y + h / 2, w * 0.85);
    bgGrad.addColorStop(0, '#2e070c');
    bgGrad.addColorStop(0.45, '#160205');
    bgGrad.addColorStop(1, '#080103');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // 2. Top Royal Crimson & Gold Header Banner
    const bannerH = 240;
    const headerGrad = ctx.createLinearGradient(x, y, x, y + bannerH);
    headerGrad.addColorStop(0, '#881337');
    headerGrad.addColorStop(0.4, '#991b1b');
    headerGrad.addColorStop(0.85, '#58080c');
    headerGrad.addColorStop(1, '#3b0609');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(x, y, w, bannerH);

    // 24K Gold Trim Ribbon below banner
    const goldRibbon = ctx.createLinearGradient(x, 0, x + w, 0);
    goldRibbon.addColorStop(0, '#92400e');
    goldRibbon.addColorStop(0.15, '#fef08a');
    goldRibbon.addColorStop(0.5, '#d4af37');
    goldRibbon.addColorStop(0.85, '#fef08a');
    goldRibbon.addColorStop(1, '#92400e');
    ctx.strokeStyle = goldRibbon;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, y + bannerH);
    ctx.lineTo(x + w, y + bannerH);
    ctx.stroke();

    // 3. Lanyard Punch Cutout graphic at top center with Gold bezel
    ctx.fillStyle = '#080103';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, y + 14, 160, 20, 10);
    ctx.fill();
    ctx.stroke();

    // 4. Logo & Company Letterhead
    const logoX = x + 40;
    const logoY = y + 55;
    const logoSize = 105;

    let logoDrawn = false;
    try {
      if (companyLogo) {
        const logoImg = await loadImage(companyLogo);
        // Container with gold border
        ctx.fillStyle = '#0f0204';
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, 18);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(logoImg, logoX + 8, logoY + 8, logoSize - 16, logoSize - 16);
        logoDrawn = true;
      }
    } catch {
      logoDrawn = false;
    }

    if (!logoDrawn) {
      // Fallback elegant Gold Crest with company initials
      ctx.fillStyle = '#1c0307';
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoSize, logoSize, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(companyAcronym.slice(0, 3), logoX + logoSize / 2, logoY + 65);
    }

    // Company Name & Subtitles
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px sans-serif';
    // Truncate company name if too long
    const cleanCompanyName = companyName.toUpperCase();
    ctx.fillText(cleanCompanyName.length > 28 ? cleanCompanyName.slice(0, 26) + '...' : cleanCompanyName, x + 165, y + 92);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('AGENCY RECOVERY MANAGEMENT SYSTEM (ARMS)', x + 165, y + 125);

    ctx.fillStyle = '#fecaca';
    ctx.font = '600 17px sans-serif';
    ctx.fillText('CONTROL TOWER & ASSET RECOVERY AUTHORITY', x + 165, y + 152);

    // Ribbon tag inside banner bottom
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(cardTypeTitle, x + 40, y + 218);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('SECURE OFFICIAL PASS', x + w - 40, y + 218);

    // 5. ENLARGED PHOTO (Satu Ukuran Badan / Half-Body Portrait)
    // Previously: 320 x 400. Now enlarged significantly to 450 x 560
    const photoW = 450;
    const photoH = 560;
    const photoX = x + (w - photoW) / 2;
    const photoY = y + 265;
    const photoR = 26;

    // Outer Glowing Metallic Gold Bezel
    const goldPhotoBorder = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    goldPhotoBorder.addColorStop(0, '#fef08a');
    goldPhotoBorder.addColorStop(0.25, '#d4af37');
    goldPhotoBorder.addColorStop(0.7, '#b45309');
    goldPhotoBorder.addColorStop(1, '#fde047');
    
    ctx.strokeStyle = goldPhotoBorder;
    ctx.lineWidth = 8;
    ctx.fillStyle = '#060102';
    ctx.beginPath();
    ctx.roundRect(photoX - 8, photoY - 8, photoW + 16, photoH + 16, photoR + 6);
    ctx.fill();
    ctx.stroke();

    let photoDrawn = false;
    if (customPhoto) {
      try {
        const photoImg = await loadImage(customPhoto);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(photoX, photoY, photoW, photoH, photoR);
        ctx.clip();

        // Draw image with aspect cover centered horizontally & top aligned
        const imgAspect = photoImg.width / photoImg.height;
        const targetAspect = photoW / photoH;
        let sWidth = photoImg.width;
        let sHeight = photoImg.height;
        let sX = 0;
        let sY = 0;

        if (imgAspect > targetAspect) {
          // Image is wider
          sWidth = photoImg.height * targetAspect;
          sX = (photoImg.width - sWidth) / 2;
        } else {
          // Image is taller: focus on upper body (start near top)
          sHeight = photoImg.width / targetAspect;
          sY = (photoImg.height - sHeight) * 0.15;
        }

        ctx.drawImage(photoImg, sX, sY, sWidth, sHeight, photoX, photoY, photoW, photoH);
        ctx.restore();
        photoDrawn = true;
      } catch (err) {
        console.warn('Could not load custom photo for canvas:', err);
      }
    }

    if (!photoDrawn) {
      // Silhouette placeholder for full half-body portrait
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, photoR);
      ctx.clip();
      
      // Gradient background
      const silBg = ctx.createLinearGradient(photoX, photoY, photoX, photoY + photoH);
      silBg.addColorStop(0, '#1c0407');
      silBg.addColorStop(1, '#090103');
      ctx.fillStyle = silBg;
      ctx.fillRect(photoX, photoY, photoW, photoH);

      // Head
      ctx.fillStyle = '#3f1118';
      ctx.beginPath();
      ctx.arc(photoX + photoW / 2, photoY + 160, 85, 0, Math.PI * 2);
      ctx.fill();

      // Half-Body Shoulders & Torso
      ctx.fillStyle = '#4a121b';
      ctx.beginPath();
      ctx.moveTo(photoX + photoW / 2 - 180, photoY + photoH);
      ctx.lineTo(photoX + photoW / 2 - 180, photoY + 380);
      ctx.bezierCurveTo(
        photoX + photoW / 2 - 170, photoY + 280,
        photoX + photoW / 2 - 80, photoY + 260,
        photoX + photoW / 2, photoY + 260
      );
      ctx.bezierCurveTo(
        photoX + photoW / 2 + 80, photoY + 260,
        photoX + photoW / 2 + 170, photoY + 280,
        photoX + photoW / 2 + 180, photoY + 380
      );
      ctx.lineTo(photoX + photoW / 2 + 180, photoY + photoH);
      ctx.closePath();
      ctx.fill();

      // Gold Tie Outline for executive distinction
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.moveTo(photoX + photoW / 2 - 15, photoY + 285);
      ctx.lineTo(photoX + photoW / 2 + 15, photoY + 285);
      ctx.lineTo(photoX + photoW / 2 + 22, photoY + 410);
      ctx.lineTo(photoX + photoW / 2, photoY + 440);
      ctx.lineTo(photoX + photoW / 2 - 22, photoY + 410);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Hologram Gold Seal Badge on photo bottom right
    const sealX = photoX + photoW - 10;
    const sealY = photoY + photoH - 10;
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(sealX, sealY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0203';
    ctx.beginPath();
    ctx.arc(sealX, sealY, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED', sealX, sealY - 4);
    ctx.font = '900 12px sans-serif';
    ctx.fillText('OFFICIAL', sealX, sealY + 13);

    // 6. Name and Title Typography below Photo
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 44px sans-serif';
    ctx.fillText(personnel.fullName.toUpperCase(), x + w / 2, y + 865);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText((personnel.position || (isKaryawan ? 'STAFF OPERASIONAL' : 'FIELD COLLECTOR')).toUpperCase(), x + w / 2, y + 906);

    ctx.fillStyle = '#fca5a5';
    ctx.font = '600 19px monospace';
    ctx.fillText(cardTypeSubtitle.toUpperCase(), x + w / 2, y + 938);

    // 7. Data Details Container Box (Red & Gold)
    const boxX = x + 50;
    const boxY = y + 965;
    const boxW = w - 100;
    const boxH = 305;

    ctx.fillStyle = '#100204';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 20);
    ctx.fill();
    ctx.stroke();

    // Key-Values inside box
    const drawRow = (label: string, val: string, rowY: number, valColor = '#ffffff') => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 19px monospace';
      ctx.fillText(label, boxX + 30, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle = valColor;
      ctx.font = '900 23px monospace';
      ctx.fillText(val, boxX + boxW - 30, rowY);
    };

    drawRow('NOMOR ID KARYAWAN', formattedId, boxY + 55, '#fca5a5');
    drawRow('DIVISI / JABATAN', (personnel.position || (isKaryawan ? 'OPERASIONAL' : 'MITRA DC')).toUpperCase(), boxY + 120, '#ffffff');
    drawRow('STATUS PERSONEL', `● ${personnel.status || 'ACTIVE'}`, boxY + 185, '#4ade80');
    drawRow('MASA BERLAKU', 'DESEMBER 2028', boxY + 250, '#fde047');

    // 8. Bottom Barcode & Security Stripe
    const bottomH = 175;
    const bottomGrad = ctx.createLinearGradient(x, y + h - bottomH, x, y + h);
    bottomGrad.addColorStop(0, '#000000');
    bottomGrad.addColorStop(1, '#3b0609');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(x, y + h - bottomH, w, bottomH);

    // Gold divider above barcode
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h - bottomH);
    ctx.lineTo(x + w, y + h - bottomH);
    ctx.stroke();

    // Barcode Mock Graphic
    const bcX = x + 60;
    const bcY = y + h - 135;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bcX, bcY, 480, 75);

    ctx.fillStyle = '#000000';
    const barWidths = [6, 2, 4, 8, 2, 6, 4, 2, 8, 4, 2, 6, 2, 4, 6, 2, 8, 4, 2, 6, 4, 2, 8, 2, 4, 6, 2, 8, 4, 2, 6];
    let curX = bcX + 15;
    for (let bw of barWidths) {
      ctx.fillRect(curX, bcY + 8, bw, 59);
      curX += bw + 6;
      if (curX > bcX + 460) break;
    }

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SN: ${companyAcronym}-${formattedId.replace(/[^A-Za-z0-9]/g, '')}`, bcX, bcY + 102);

    // QR Code Box Graphic on bottom right
    const qrSize = 100;
    const qrX = x + w - 60 - qrSize;
    const qrY = y + h - 138;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX, qrY, qrSize, qrSize, 12);
    ctx.fill();

    // Mock QR patterns
    ctx.fillStyle = '#000000';
    ctx.fillRect(qrX + 12, qrY + 12, 28, 28);
    ctx.clearRect(qrX + 18, qrY + 18, 16, 16);
    ctx.fillRect(qrX + 22, qrY + 22, 8, 8);

    ctx.fillRect(qrX + qrSize - 40, qrY + 12, 28, 28);
    ctx.clearRect(qrX + qrSize - 34, qrY + 18, 16, 16);
    ctx.fillRect(qrX + qrSize - 30, qrY + 22, 8, 8);

    ctx.fillRect(qrX + 12, qrY + qrSize - 40, 28, 28);
    ctx.clearRect(qrX + 18, qrY + qrSize - 34, 16, 16);
    ctx.fillRect(qrX + 22, qrY + qrSize - 30, 8, 8);

    ctx.fillRect(qrX + 50, qrY + 50, 16, 16);
    ctx.fillRect(qrX + 70, qrY + 60, 12, 12);
    ctx.fillRect(qrX + 50, qrY + 74, 14, 14);

    // Dual-Ring Outer Gold Borders
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, w - 10, h - 10, r);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 14, w - 28, h - 28, r - 6);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Draws the Back of the ID Card in Red & Gold Luxury Palette
   */
  const drawBackCard = async (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();

    // 1. Dark Burgundy-Obsidian Background
    const bgGrad = ctx.createRadialGradient(x + w / 2, y + h - 250, 40, x + w / 2, y + h / 2, w * 0.85);
    bgGrad.addColorStop(0, '#2e070c');
    bgGrad.addColorStop(0.5, '#140205');
    bgGrad.addColorStop(1, '#080103');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // 2. Lanyard Hole Graphic with Gold Accent
    ctx.fillStyle = '#080103';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, y + 14, 160, 20, 10);
    ctx.fill();
    ctx.stroke();

    // 3. Magnetic Stripe at top with Gold Holographic Track
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y + 65, w, 115);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + 65);
    ctx.lineTo(x + w, y + 65);
    ctx.moveTo(x, y + 180);
    ctx.lineTo(x + w, y + 180);
    ctx.stroke();

    // Gold Track Holographic Band
    const trackGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    trackGrad.addColorStop(0, '#78350f');
    trackGrad.addColorStop(0.2, '#fef08a');
    trackGrad.addColorStop(0.5, '#d4af37');
    trackGrad.addColorStop(0.8, '#fef08a');
    trackGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(x + 30, y + 112, w - 60, 20);

    // 4. Terms of Use Heading in Gold
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 28px sans-serif';
    ctx.fillText('KETENTUAN PEMEGANG KARTU (TERMS OF USE)', x + 50, y + 240);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ARMS-SEC-V8', x + w - 50, y + 240);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 260);
    ctx.lineTo(x + w - 50, y + 260);
    ctx.stroke();

    // 5. Terms List
    const terms = [
      `1. Kartu ini adalah tanda pengenal resmi ${companyName} dan wajib dikalungkan selama jam tugas operasional.`,
      '2. Dilarang memindahtangankan, meminjamkan, atau menduplikasi kartu ini kepada pihak lain yang tidak berwenang.',
      '3. Segala tindakan hukum dan penagihan lapangan wajib mematuhi SOP Resmi, Surat Kuasa (SK), dan Kode Etik ARMS.',
      '4. Apabila kartu ini hilang atau ditemukan pihak lain, mohon segera mengembalikan ke alamat kantor pusat tertera di bawah.',
    ];

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '500 22px sans-serif';

    let termY = y + 310;
    for (let term of terms) {
      const words = term.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > w - 120 && n > 0) {
          ctx.fillText(line, x + 60, termY);
          line = words[n] + ' ';
          termY += 34;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x + 60, termY);
      termY += 46;
    }

    // 6. Company Address & Contact Box (Red & Gold)
    const contactBoxY = y + 745;
    const contactBoxH = 340;
    ctx.fillStyle = '#100204';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x + 50, contactBoxY, w - 100, contactBoxH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 27px sans-serif';
    ctx.fillText(`${companyName.toUpperCase()} — HEAD OFFICE`, x + 80, contactBoxY + 55);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = '500 21px sans-serif';
    
    // Wrap address if long
    const addrWords = `Alamat: ${companyAddress}`.split(' ');
    let addrLine = '';
    let addrY = contactBoxY + 105;
    for (let n = 0; n < addrWords.length; n++) {
      const test = addrLine + addrWords[n] + ' ';
      if (ctx.measureText(test).width > w - 180 && n > 0) {
        ctx.fillText(addrLine, x + 80, addrY);
        addrLine = addrWords[n] + ' ';
        addrY += 30;
      } else {
        addrLine = test;
      }
    }
    ctx.fillText(addrLine, x + 80, addrY);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 21px sans-serif';
    ctx.fillText(`Hotline: ${companyPhone}`, x + 80, addrY + 45);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = '500 21px sans-serif';
    ctx.fillText(`Email Operasional: ${companyEmail}`, x + 80, addrY + 80);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 19px monospace';
    ctx.fillText('SISTEM ARMS PENGAMANAN ASET & RECOVERY DANA', x + 80, contactBoxY + contactBoxH - 30);

    // 7. Director Signature & Official Stamp Area
    const sigY = y + 1135;
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('DITERBITKAN RESMI DI:', x + 70, sigY + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(issueCity, x + 70, sigY + 65);
    ctx.fillStyle = '#fde047';
    ctx.font = '600 18px monospace';
    ctx.fillText('ARMS Identity Authority', x + 70, sigY + 95);

    // Official Stamp Graphic (Gold & Crimson)
    const stampX = x + w - 240;
    const stampY = sigY + 60;
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate((-15 * Math.PI) / 180);
    
    // Outer dashed ring
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner solid ring
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = '900 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(companyAcronym.slice(0, 8), 0, -22);
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('OFFICIAL STAMP', 0, 3);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('VERIFIED 2026', 0, 26);
    ctx.restore();

    // Signature line in Gold
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w - 380, sigY + 110);
    ctx.lineTo(x + w - 70, sigY + 110);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'italic bold 32px serif';
    ctx.fillText('Irvan Indralaksana', x + w - 225, sigY + 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.fillText('DIREKTUR UTAMA', x + w - 225, sigY + 140);

    // 8. Bottom Brand Ribbon in Crimson & Gold
    const bottomH = 90;
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x, y + h - bottomH, w, bottomH);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h - bottomH);
    ctx.lineTo(x + w, y + h - bottomH);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`AGENCY RECOVERY MANAGEMENT SYSTEM — PROPERTY OF ${companyName.toUpperCase()}`, x + w / 2, y + h - 35);

    // Outer Dual-Ring Gold Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, w - 10, h - 10, r);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 14, w - 28, h - 28, r - 6);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Universal Download Trigger
   */
  const handleDownload = async (target: 'FRONT' | 'BACK' | 'BOTH') => {
    setIsDownloading(true);
    try {
      const dataUrl = await generateCanvasCard(target);

      const parts = dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      const filename = `ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}_${target}_RED_GOLD_HD.png`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 2000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generating card:', err);
      alert(`Gagal merender ID Card: ${err.message || String(err)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      const dataUrl = await generateCanvasCard(viewMode);
      const newWin = window.open('');
      if (newWin) {
        newWin.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Cetak ID Card Red & Gold - ${personnel.fullName}</title>
              <style>
                body { margin: 0; background: #060102; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: #fff; padding: 20px; }
                img { max-width: 90vw; max-height: 85vh; border-radius: 20px; box-shadow: 0 15px 50px rgba(0,0,0,0.9); border: 3px solid #d4af37; }
                .btn { margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #b91c1c, #991b1b); color: #fef08a; border: 2px solid #d4af37; border-radius: 10px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 16px; box-shadow: 0 4px 20px rgba(212,175,55,0.3); }
                .btn:hover { background: #dc2626; color: #fff; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="ID Card ${personnel.fullName}" />
              <div style="margin-top: 20px;">
                <a class="btn" href="${dataUrl}" download="ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}_RED_GOLD.png">Download Gambar HD (Red & Gold)</a>
              </div>
            </body>
          </html>
        `);
      }
    } catch (err: any) {
      alert(`Gagal membuka tab baru: ${err.message}`);
    }
  };

  const handlePrint = async () => {
    try {
      setIsDownloading(true);
      const dataUrl = await generateCanvasCard(viewMode);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>Cetak ID Card - ${personnel.fullName}</title>
              <style>
                @page { size: A4; margin: 10mm; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; }
                img { max-width: 100%; max-height: 95vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="window.print();window.close();" />
            </body>
          </html>
        `);
      }
    } catch (e: any) {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-4xl p-3.5 sm:p-4 space-y-4 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-amber-500 via-red-600 to-red-950 rounded-xl border border-amber-400/50 text-amber-200 shadow-lg">
              <CreditCard className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg tracking-wide">
                  ID Card Generator Resmi — {personnel.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600 flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  RED & GOLD EDITION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kartu Tanda Pengenal Resmi <span className="text-amber-300 font-semibold">{companyName}</span> dengan format CR80 dan Pas Foto Ukuran Badan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition self-end sm:self-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & View Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-amber-500/20">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('BOTH')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'BOTH'
                  ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Dua Sisi (Depan & Belakang)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FRONT')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'FRONT'
                  ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tampak Depan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BACK')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'BACK'
                  ? 'bg-gradient-to-r from-red-700 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tampak Belakang</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Photo Upload Button */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-amber-500/40 transition cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Pas Foto Badan</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Open / Preview in Tab */}
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Buka Gambar Resolusi Penuh di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Buka Gambar HD</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Langsung</span>
            </button>

            {/* Download High-Res PNG Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload(viewMode)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-950/50 border border-amber-400/40 transition transform active:scale-95 cursor-pointer"
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-200" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-200" />
              )}
              <span>{isDownloading ? 'Sedang Merender HD...' : 'Download ID Card (PNG HD)'}</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-2.5 bg-amber-950/90 border border-amber-500 text-amber-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-4 h-4 text-amber-400" />
            <span>ID Card Red & Gold berhasil diunduh dalam format PNG 300 DPI siap cetak!</span>
          </div>
        )}

        {/* Cards Preview Display Area */}
        <div className="flex items-center justify-center p-3 bg-slate-950/90 rounded-2xl border border-amber-500/20 overflow-x-auto min-h-[500px]">
          <div
            ref={bothCardsRef}
            className="flex flex-wrap items-center justify-center gap-5 p-3 bg-slate-950 rounded-xl"
          >
            {/* FRONT SIDE CARD (Tampak Depan - Red & Gold) */}
            {(viewMode === 'FRONT' || viewMode === 'BOTH') && (
              <div
                ref={frontCardRef}
                className="w-[330px] min-h-[550px] bg-[#090103] rounded-[24px] border-2 border-amber-400/90 shadow-[0_0_30px_rgba(217,119,6,0.35)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 15%, #2a060a 0%, #090103 75%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic with Gold Border */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-black border border-amber-400/70 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-1 bg-[#260505] rounded-full" />
                </div>

                {/* Top Geometric Royal Crimson Banner & Letterhead */}
                <div className="relative pt-6 px-3 pb-2 bg-gradient-to-b from-red-800 via-red-900 to-[#3b0609] border-b-2 border-amber-400/80">
                  {/* Company Logo & Name from Settings */}
                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-11 h-11 rounded-lg bg-black/80 p-1 border border-amber-400/60 shadow-md shrink-0 flex items-center justify-center">
                      <img
                        src={companyLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to text initials if broken
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="text-amber-400 font-extrabold text-xs tracking-wider hidden" id="fallback-initial">
                        {companyAcronym.slice(0, 3)}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-black text-sm text-white tracking-wider uppercase leading-none truncate" title={companyName}>
                        {companyName}
                      </div>
                      <div className="text-[9px] font-bold text-amber-300 tracking-widest uppercase mt-0.5">
                        ARMS CONTROL TOWER
                      </div>
                      <div className="text-[7.5px] text-red-200/90 font-mono tracking-tight uppercase truncate">
                        LEGAL & DEBT RECOVERY AGENCY
                      </div>
                    </div>
                  </div>

                  {/* Card Type Tag with Gold finish */}
                  <div className="mt-1.5 flex items-center justify-between border-t border-amber-500/40 pt-1.5">
                    <span className="text-[8.5px] font-black text-amber-300 tracking-wider uppercase">
                      {cardTypeTitle}
                    </span>
                    <span className="text-[8px] font-mono text-amber-200 bg-black/60 px-1.5 py-0.5 rounded border border-amber-400/50">
                      SECURE ID
                    </span>
                  </div>
                </div>

                {/* Middle Body: Photo & Identity (ENLARGED FOTO UKURAN BADAN) */}
                <div className="px-3 py-2.5 flex flex-col items-center text-center relative z-10 flex-1 justify-center space-y-2">
                  {/* Portrait Photo Frame with Royal Gold Bezel (Satu Ukuran Badan) */}
                  <div className="relative">
                    <div className="w-40 h-52 sm:w-44 sm:h-56 rounded-2xl p-[3px] bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 shadow-[0_0_20px_rgba(245,158,11,0.4)] relative">
                      <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-950 border border-amber-950 flex items-center justify-center">
                        {customPhoto ? (
                          <img
                            src={customPhoto}
                            alt={personnel.fullName}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-[#1c0407] to-slate-950 flex flex-col items-center justify-center text-amber-300/60 p-2">
                            <Camera className="w-8 h-8 text-amber-400 mb-1" />
                            <span className="text-[9px] text-amber-200 font-semibold tracking-wide">PAS FOTO BADAN</span>
                            <span className="text-[7.5px] text-slate-400 mt-0.5">3/4 Portrait Pas</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verified Gold Seal Badge */}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 p-[1.5px] shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center text-amber-300">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="space-y-0.5 w-full">
                    <h4 className="text-base font-black text-white tracking-wide uppercase leading-tight">
                      {personnel.fullName}
                    </h4>
                    <div className="text-[11px] font-bold text-amber-400 tracking-wide uppercase">
                      {personnel.position || (isKaryawan ? 'STAFF OPERASIONAL' : 'FIELD COLLECTOR')}
                    </div>
                    <div className="text-[8.5px] font-mono text-red-200 tracking-wider uppercase">
                      {cardTypeSubtitle}
                    </div>
                  </div>

                  {/* ID & Details Key-Value Grid (Red & Gold) */}
                  <div className="w-full bg-black/80 border border-amber-500/50 rounded-xl p-2 grid grid-cols-2 gap-1.5 text-left text-[9px] shadow-inner font-mono">
                    <div>
                      <span className="text-amber-400/90 text-[8px] block uppercase font-bold">ID KARYAWAN:</span>
                      <span className="text-red-300 font-extrabold text-[10px]">{formattedId}</span>
                    </div>
                    <div>
                      <span className="text-amber-400/90 text-[8px] block uppercase font-bold">STATUS PAS:</span>
                      <span className="text-emerald-400 font-bold text-[9px]">● {personnel.status || 'ACTIVE'}</span>
                    </div>
                    <div>
                      <span className="text-amber-400/90 text-[8px] block uppercase font-bold">DIVISI / JABATAN:</span>
                      <span className="text-slate-200 font-medium truncate block">{personnel.position || (isKaryawan ? 'OPERASIONAL' : 'MITRA DC')}</span>
                    </div>
                    <div>
                      <span className="text-amber-400/90 text-[8px] block uppercase font-bold">BERLAKU S/D:</span>
                      <span className="text-amber-300 font-semibold">DES 2028</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Barcode & Security Strip with Gold borders */}
                <div className="px-3 py-2 bg-gradient-to-t from-red-950 via-black to-black border-t-2 border-amber-500/70 flex items-center justify-between relative z-10">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-[2px] h-5 bg-white p-1 rounded">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1].map((w, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[7px] font-mono text-amber-300 tracking-widest mt-0.5">
                      {`ARMS-${formattedId.replace(/[^A-Za-z0-9]/g, '')}`}
                    </span>
                  </div>

                  <div className="w-6 h-6 bg-white p-0.5 rounded border border-amber-400 shadow shrink-0 flex items-center justify-center">
                    <QrCode className="w-full h-full text-black" />
                  </div>
                </div>
              </div>
            )}

            {/* BACK SIDE CARD (Tampak Belakang - Red & Gold) */}
            {(viewMode === 'BACK' || viewMode === 'BOTH') && (
              <div
                ref={backCardRef}
                className="w-[330px] min-h-[550px] bg-[#090103] rounded-[24px] border-2 border-amber-400/90 shadow-[0_0_30px_rgba(217,119,6,0.35)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 85%, #2a060a 0%, #090103 75%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic with Gold Border */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-black border border-amber-400/70 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-1 bg-[#260505] rounded-full" />
                </div>

                {/* Magnetic Stripe Graphic with Gold Track */}
                <div className="pt-6">
                  <div className="w-full h-9 bg-black border-y border-amber-500/50 shadow-inner flex items-center px-3">
                    <div className="w-full h-2 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-800 opacity-80" />
                  </div>
                </div>

                {/* Terms of Use & Security Policies */}
                <div className="px-3.5 py-2 space-y-2 flex-1 flex flex-col justify-center">
                  <div className="border-b border-amber-500/40 pb-1 flex items-center justify-between">
                    <span className="text-[9px] font-black text-amber-400 tracking-wider uppercase">
                      KETENTUAN PEMEGANG KARTU (TERMS OF USE)
                    </span>
                    <span className="text-[7.5px] font-mono text-amber-300">ARMS-SEC-V8</span>
                  </div>

                  <ol className="text-[7.5px] text-slate-200 space-y-1 list-decimal list-inside leading-normal">
                    <li>
                      Kartu ini adalah tanda pengenal resmi <span className="text-amber-300 font-bold">{companyName}</span> dan wajib dikalungkan selama bertugas.
                    </li>
                    <li>
                      Dilarang memindahtangankan, menduplikasi, atau menyalahgunakan kartu ini kepada pihak ketiga.
                    </li>
                    <li>
                      Segala tindakan hukum dan penagihan tunduk pada SOP Resmi, SK Kuasa, dan Kode Etik ARMS.
                    </li>
                    <li>
                      Jika kartu ini ditemukan, harap segera dikembalikan ke alamat kantor pusat di bawah.
                    </li>
                  </ol>

                  {/* Company Address & Contacts (Dynamic from Settings) */}
                  <div className="bg-black/80 border border-amber-500/50 rounded-xl p-2.5 space-y-1 text-[7.5px] text-slate-300 shadow-inner">
                    <div className="font-bold text-white text-[8.5px] flex items-center gap-1 border-b border-amber-500/30 pb-1">
                      <Building className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate uppercase">{companyName} — HEAD OFFICE</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-slate-300">{companyAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-mono text-amber-300 font-bold">{companyPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-slate-300">{companyEmail}</span>
                    </div>
                  </div>

                  {/* Official Signature & Verification Stamp Area */}
                  <div className="pt-1 flex items-end justify-between px-2">
                    <div className="text-left space-y-0.5">
                      <div className="text-[7px] text-amber-400 uppercase font-mono font-bold">Diterbitkan di:</div>
                      <div className="text-[8px] font-bold text-white">{issueCity}</div>
                      <div className="text-[7px] text-amber-300 font-mono">ARMS Security Authority</div>
                    </div>

                    {/* Official Stamp & Director Signature */}
                    <div className="text-center relative">
                      <div className="absolute -top-3 -right-2 w-14 h-14 rounded-full border-2 border-amber-400/80 border-dashed opacity-75 flex items-center justify-center pointer-events-none rotate-[-15deg]">
                        <div className="text-[6px] font-black text-amber-400 uppercase tracking-tighter text-center">
                          {companyAcronym.slice(0, 8)}<br />VERIFIED<br />STAMP
                        </div>
                      </div>
                      <div className="w-24 h-4 border-b-2 border-amber-400 flex items-end justify-center pb-0.5">
                        <span className="font-serif italic text-[11px] text-amber-200 opacity-95">Irvan I.</span>
                      </div>
                      <div className="text-[7.5px] font-bold text-white uppercase mt-0.5">DIREKTUR UTAMA</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Holographic Brand Band */}
                <div className="px-3 py-2 bg-gradient-to-r from-red-950 via-black to-red-950 border-t-2 border-amber-500/70 flex items-center justify-between text-[7px] text-amber-300 font-mono">
                  <span>AGENCY RECOVERY MANAGEMENT SYSTEM</span>
                  <span className="text-amber-400 font-bold uppercase truncate max-w-[170px]">PROPERTY OF {companyName}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Format kartu Red & Gold dengan Pas Foto Badan kompatibel standar CR80 Lanyard (85.6mm x 53.98mm).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload('BOTH')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-200" />
              <span>Download Lembar Cetak Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
