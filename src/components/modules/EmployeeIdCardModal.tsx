import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
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
  Eye,
  RefreshCw,
  FileCheck
} from 'lucide-react';

interface EmployeeIdCardModalProps {
  personnel: Personnel;
  settings?: AppSettings;
  onClose: () => void;
  onUpdatePersonnelPhoto?: (personnelId: string, newPhotoUrl: string) => void;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  personnel,
  settings,
  onClose,
  onUpdatePersonnelPhoto,
}) => {
  const [viewMode, setViewMode] = useState<'FRONT' | 'BACK' | 'BOTH'>('BOTH');
  const [isDownloading, setIsDownloading] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string>(personnel.ktpPhotoUrl || '');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const bothCardsRef = useRef<HTMLDivElement>(null);

  const companyName = settings?.companyName || 'PT. MITRA JASA TAMA';
  const companyLogo = settings?.companyLogo || DEFAULT_MJ_LOGO;
  const companyAddress = settings?.companyAddress || 'Jl. Galuh Mas Raya Blok A No. 88, Telukjambe Timur, Karawang, Jawa Barat 41361';
  const companyPhone = settings?.companyPhone || '+62 267 845 9988 / 0812-9988-7766';
  const companyEmail = settings?.companyEmail || 'operations@mitrajasa.co.id';

  const isKaryawan = personnel.type === 'KARYAWAN';
  const cardTypeTitle = isKaryawan ? 'OFFICIAL EMPLOYEE ID PASS' : 'FIELD EXECUTOR BADGE';
  const cardTypeSubtitle = isKaryawan ? 'KARYAWAN INTERNAL OPERASIONAL' : 'MITRA DC & ASSET RECOVERY';
  const formattedId = personnel.id.startsWith('EMP') || personnel.id.startsWith('MITRA') 
    ? personnel.id 
    : `${isKaryawan ? 'MJT-KRY' : 'MJT-DC'}-${personnel.id.replace(/[^0-9]/g, '').slice(-4) || '2026'}`;

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
   * Pure Canvas 2D Generator Engine
   * Draws ultra high-definition (300 DPI) cards with zero CSS dependency issues
   */
  const generateCanvasCard = async (target: 'FRONT' | 'BACK' | 'BOTH'): Promise<string> => {
    const CARD_WIDTH = 960;
    const CARD_HEIGHT = 1500;
    const CORNER_RADIUS = 50;

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    if (target === 'BOTH') {
      canvas = document.createElement('canvas');
      canvas.width = CARD_WIDTH * 2 + 160;
      canvas.height = CARD_HEIGHT + 160;
      ctx = canvas.getContext('2d')!;
      // Sheet background
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw cutting guide text
      ctx.fillStyle = '#71717a';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PT. MITRA JASA TAMA — LEMBAR CETAK RESMI ID CARD (STANDAR CR80 LANYARD)', canvas.width / 2, 50);

      // Draw Front Card at (60, 90)
      await drawFrontCard(ctx, 60, 90, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);

      // Draw Back Card at (CARD_WIDTH + 100, 90)
      await drawBackCard(ctx, CARD_WIDTH + 100, 90, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS);
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
   * Draws the Front of the ID Card in Red & Black
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

    // 1. Dark Carbon Base Background
    const bgGrad = ctx.createRadialGradient(x + w / 2, y + 200, 50, x + w / 2, y + h / 2, w);
    bgGrad.addColorStop(0, '#260505');
    bgGrad.addColorStop(0.5, '#0d0d11');
    bgGrad.addColorStop(1, '#050507');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // 2. Top Crimson Red Header Banner
    const bannerH = 260;
    const headerGrad = ctx.createLinearGradient(x, y, x, y + bannerH);
    headerGrad.addColorStop(0, '#991b1b');
    headerGrad.addColorStop(0.5, '#7f1d1d');
    headerGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(x, y, w, bannerH);

    // Gold trim line below banner
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, y + bannerH);
    ctx.lineTo(x + w, y + bannerH);
    ctx.stroke();

    // 3. Lanyard Punch Cutout graphic at top center
    ctx.fillStyle = '#050507';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, y + 16, 160, 20, 10);
    ctx.fill();
    ctx.stroke();

    // 4. Logo & Company Letterhead
    try {
      if (companyLogo) {
        const logoImg = await loadImage(companyLogo);
        ctx.drawImage(logoImg, x + 40, y + 65, 110, 110);
      }
    } catch {
      // Fallback logo icon badge
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.roundRect(x + 40, y + 65, 110, 110, 20);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('MJT', x + 65, y + 135);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 38px sans-serif';
    ctx.fillText(companyName, x + 175, y + 105);

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('AGENCY RECOVERY MANAGEMENT SYSTEM (ARMS)', x + 175, y + 140);

    ctx.fillStyle = '#fecaca';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('LEGAL & ASSET RECOVERY CONTROL TOWER', x + 175, y + 170);

    // Tag under banner
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(cardTypeTitle, x + 40, y + 235);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('SECURE IDENTITY PASS', x + w - 40, y + 235);

    // 5. Employee Portrait Photo
    const photoX = x + w / 2 - 160;
    const photoY = y + 310;
    const photoW = 320;
    const photoH = 400;
    const photoR = 30;

    // Photo outer glowing border
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 8;
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.roundRect(photoX - 8, photoY - 8, photoW + 16, photoH + 16, photoR + 6);
    ctx.stroke();
    ctx.fill();

    let photoDrawn = false;
    if (customPhoto) {
      try {
        const photoImg = await loadImage(customPhoto);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(photoX, photoY, photoW, photoH, photoR);
        ctx.clip();
        ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
        ctx.restore();
        photoDrawn = true;
      } catch (err) {
        console.warn('Could not load custom photo for canvas:', err);
      }
    }

    if (!photoDrawn) {
      // Silhouette placeholder
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, photoR);
      ctx.clip();
      ctx.fillStyle = '#18181b';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      // Head
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(photoX + photoW / 2, photoY + 140, 70, 0, Math.PI * 2);
      ctx.fill();
      // Shoulders
      ctx.beginPath();
      ctx.arc(photoX + photoW / 2, photoY + 380, 160, 0, Math.PI, true);
      ctx.fill();
      ctx.restore();
    }

    // Hologram Seal Badge on photo bottom right
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(photoX + photoW - 15, photoY + photoH - 15, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(photoX + photoW - 15, photoY + photoH - 15, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED', photoX + photoW - 15, photoY + photoH - 10);

    // 6. Name and Title Typography
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px sans-serif';
    ctx.fillText(personnel.fullName.toUpperCase(), x + w / 2, y + 780);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText((personnel.position || (isKaryawan ? 'STAFF OPERASIONAL' : 'FIELD COLLECTOR')).toUpperCase(), x + w / 2, y + 825);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 20px monospace';
    ctx.fillText(cardTypeSubtitle.toUpperCase(), x + w / 2, y + 860);

    // 7. Data Details Container Box
    const boxX = x + 50;
    const boxY = y + 890;
    const boxW = w - 100;
    const boxH = 340;

    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 20);
    ctx.fill();
    ctx.stroke();

    // Key-Values inside box
    const drawRow = (label: string, val: string, rowY: number, valColor = '#ffffff') => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#71717a';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(label, boxX + 30, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle = valColor;
      ctx.font = '900 24px monospace';
      ctx.fillText(val, boxX + boxW - 30, rowY);
    };

    drawRow('NOMOR ID KARYAWAN', formattedId, boxY + 60, '#f87171');
    drawRow('DIVISI / JABATAN', (personnel.position || (isKaryawan ? 'OPERASIONAL' : 'MITRA DC')).toUpperCase(), boxY + 130, '#ffffff');
    drawRow('STATUS PERSONEL', `● ${personnel.status || 'ACTIVE'}`, boxY + 200, '#4ade80');
    drawRow('MASA BERLAKU', 'DESEMBER 2028', boxY + 270, '#fde047');

    // 8. Bottom Barcode & Security Stripe
    const bottomH = 180;
    const bottomGrad = ctx.createLinearGradient(x, y + h - bottomH, x, y + h);
    bottomGrad.addColorStop(0, '#000000');
    bottomGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(x, y + h - bottomH, w, bottomH);

    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + h - bottomH);
    ctx.lineTo(x + w, y + h - bottomH);
    ctx.stroke();

    // Barcode Mock Graphic
    const bcX = x + 60;
    const bcY = y + h - 140;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bcX, bcY, 480, 80);

    ctx.fillStyle = '#000000';
    const barWidths = [6, 2, 4, 8, 2, 6, 4, 2, 8, 4, 2, 6, 2, 4, 6, 2, 8, 4, 2, 6, 4, 2, 8, 2, 4, 6, 2, 8, 4, 2, 6];
    let curX = bcX + 15;
    for (let bw of barWidths) {
      ctx.fillRect(curX, bcY + 8, bw, 64);
      curX += bw + 6;
      if (curX > bcX + 460) break;
    }

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SN: ARMS-${formattedId.replace(/[^A-Za-z0-9]/g, '')}`, bcX, bcY + 110);

    // QR Code Box Graphic on bottom right
    const qrSize = 100;
    const qrX = x + w - 60 - qrSize;
    const qrY = y + h - 140;

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

    // Card Outer Red Border
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, w - 10, h - 10, r);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Draws the Back of the ID Card in Red & Black
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

    // 1. Dark Base Background
    const bgGrad = ctx.createRadialGradient(x + w / 2, y + h - 200, 50, x + w / 2, y + h / 2, w);
    bgGrad.addColorStop(0, '#260505');
    bgGrad.addColorStop(0.6, '#0d0d11');
    bgGrad.addColorStop(1, '#050507');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(x, y, w, h);

    // 2. Lanyard Hole Graphic
    ctx.fillStyle = '#050507';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 80, y + 16, 160, 20, 10);
    ctx.fill();
    ctx.stroke();

    // 3. Magnetic Stripe at top
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y + 70, w, 110);
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 70);
    ctx.lineTo(x + w, y + 70);
    ctx.moveTo(x, y + 180);
    ctx.lineTo(x + w, y + 180);
    ctx.stroke();

    // Track Holographic Stripe inside magnetic band
    const trackGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    trackGrad.addColorStop(0, '#7f1d1d');
    trackGrad.addColorStop(0.5, '#dc2626');
    trackGrad.addColorStop(1, '#450a0a');
    ctx.fillStyle = trackGrad;
    ctx.fillRect(x + 30, y + 115, w - 60, 18);

    // 4. Terms of Use Heading
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 28px sans-serif';
    ctx.fillText('KETENTUAN PEMEGANG KARTU (TERMS OF USE)', x + 50, y + 240);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('ARMS-SEC-V8', x + w - 50, y + 240);

    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 260);
    ctx.lineTo(x + w - 50, y + 260);
    ctx.stroke();

    // 5. Terms List
    const terms = [
      '1. Kartu ini adalah tanda pengenal resmi PT. MITRA JASA TAMA dan wajib dikalungkan selama jam tugas operasional.',
      '2. Dilarang memindahtangankan, meminjamkan, atau menduplikasi kartu ini kepada pihak lain yang tidak berwenang.',
      '3. Segala tindakan hukum dan penagihan lapangan wajib mematuhi SOP Resmi, Surat Kuasa (SK), dan Kode Etik ARMS.',
      '4. Apabila kartu ini hilang atau ditemukan pihak lain, mohon segera mengembalikan ke alamat kantor pusat tertera di bawah.',
    ];

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e4e4e7';
    ctx.font = '500 22px sans-serif';

    let termY = y + 310;
    for (let term of terms) {
      // Word wrap term
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
      termY += 45;
    }

    // 6. Company Address & Contact Box
    const contactBoxY = y + 740;
    const contactBoxH = 340;
    ctx.fillStyle = '#09090b';
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + 50, contactBoxY, w - 100, contactBoxH, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(`${companyName} — HEAD OFFICE`, x + 80, contactBoxY + 55);

    ctx.fillStyle = '#d4d4d8';
    ctx.font = '500 22px sans-serif';
    ctx.fillText(`Alamat: ${companyAddress}`, x + 80, contactBoxY + 110);
    ctx.fillText(`Hotline: ${companyPhone}`, x + 80, contactBoxY + 165);
    ctx.fillText(`Email Operasional: ${companyEmail}`, x + 80, contactBoxY + 220);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SISTEM ARMS PENGAMANAN ASET & RECOVERY DANA', x + 80, contactBoxY + 285);

    // 7. Director Signature & Official Stamp Area
    const sigY = y + 1130;
    ctx.fillStyle = '#71717a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('DITERBITKAN RESMI DI:', x + 70, sigY + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Karawang, Jawa Barat', x + 70, sigY + 65);
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '600 18px monospace';
    ctx.fillText('ARMS Identity Authority', x + 70, sigY + 95);

    // Stamp Graphic
    const stampX = x + w - 240;
    const stampY = sigY + 60;
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate((-15 * Math.PI) / 180);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PT. MITRA JASA TAMA', 0, -20);
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('OFFICIAL STAMP', 0, 5);
    ctx.fillText('VERIFIED 2026', 0, 30);
    ctx.restore();

    // Signature line
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w - 380, sigY + 110);
    ctx.lineTo(x + w - 70, sigY + 110);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'italic bold 32px serif';
    ctx.fillText('Irvan Indralaksana', x + w - 225, sigY + 95);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px sans-serif';
    ctx.fillText('DIREKTUR UTAMA', x + w - 225, sigY + 140);

    // 8. Bottom Brand Ribbon
    const bottomH = 90;
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x, y + h - bottomH, w, bottomH);

    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + h - bottomH);
    ctx.lineTo(x + w, y + h - bottomH);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('AGENCY RECOVERY MANAGEMENT SYSTEM — PROPERTY OF PT. MITRA JASA TAMA', x + w / 2, y + h - 35);

    // Outer Red Border
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 5, w - 10, h - 10, r);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Universal Download Trigger
   * Converts dataURL to Blob and triggers direct reliable download without iframe sandbox blocks
   */
  const handleDownload = async (target: 'FRONT' | 'BACK' | 'BOTH') => {
    setIsDownloading(true);
    try {
      // 1. Generate via High-Res Direct Canvas Engine
      const dataUrl = await generateCanvasCard(target);

      // 2. Set preview for user
      setPreviewImageUrl(dataUrl);

      // 3. Create Blob from DataURL
      const parts = dataUrl.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      // 4. Trigger Download
      const filename = `ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}_${target}_HD.png`;
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
          <html>
            <head>
              <title>Cetak ID Card - ${personnel.fullName}</title>
              <style>
                body { margin: 0; background: #09090b; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; color: #fff; padding: 20px; }
                img { max-width: 90vw; max-height: 85vh; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); border: 2px solid #b91c1c; }
                .btn { margin-top: 20px; padding: 12px 24px; background: #dc2626; color: #fff; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 16px; }
                .btn:hover { background: #b91c1c; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="ID Card ${personnel.fullName}" />
              <div style="margin-top: 15px;">
                <a class="btn" href="${dataUrl}" download="ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}.png">Klik Kanan / Download Gambar HD</a>
              </div>
            </body>
          </html>
        `);
      } else {
        // Fallback if popup blocked: render in modal preview
        setPreviewImageUrl(dataUrl);
      }
    } catch (err: any) {
      alert(`Gagal membuka tab baru: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-3.5 sm:p-4 space-y-4 shadow-2xl relative my-auto max-h-[85vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-red-600 to-red-950 rounded-xl border border-red-500/40 text-white shadow-lg">
              <CreditCard className="w-5 h-5 text-red-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg tracking-wide">
                  ID Card Generator Resmi — {personnel.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">
                  RED & BLACK EDITION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kartu Tanda Pengenal Resmi ARMS dengan format standar ID Badge CR80, Logo & Kop Perusahaan.
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
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('BOTH')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'BOTH'
                  ? 'bg-red-600 text-white shadow-md'
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
                  ? 'bg-red-600 text-white shadow-md'
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
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tampak Belakang</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Photo Upload Button */}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer">
              <Camera className="w-3 h-3 text-amber-400" />
              <span>Ganti Pas Foto</span>
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
              <ExternalLink className="w-3 h-3 text-indigo-400" />
              <span>Buka Gambar HD</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-3 h-3 text-blue-400" />
              <span>Cetak Langsung</span>
            </button>

            {/* Download High-Res PNG Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload(viewMode)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-950/50 border border-red-500/30 transition transform active:scale-95 cursor-pointer"
            >
              {isDownloading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              <span>{isDownloading ? 'Sedang Merender HD...' : 'Download ID Card (PNG HD)'}</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-2.5 bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>ID Card HD berhasil diunduh dalam format PNG 300 DPI siap cetak!</span>
          </div>
        )}

        {/* Cards Preview Display Area */}
        <div className="flex items-center justify-center p-3 bg-slate-950/90 rounded-2xl border border-slate-800/80 overflow-x-auto min-h-[480px]">
          <div
            ref={bothCardsRef}
            className="flex flex-wrap items-center justify-center gap-4 p-3 bg-slate-950 rounded-xl"
          >
            {/* FRONT SIDE CARD (Tampak Depan) */}
            {(viewMode === 'FRONT' || viewMode === 'BOTH') && (
              <div
                ref={frontCardRef}
                className="w-[320px] h-[500px] bg-[#09090b] rounded-[22px] border-2 border-red-700/80 shadow-[0_0_25px_rgba(220,38,38,0.25)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 10%, #1f0404 0%, #09090b 70%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 border border-red-900/60 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-1 bg-black rounded-full" />
                </div>

                {/* Top Geometric Crimson Banner & Letterhead */}
                <div className="relative pt-6 px-3 pb-2 bg-gradient-to-b from-red-800 via-red-900 to-red-950 border-b border-red-600/40">
                  {/* Company Logo & Name */}
                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-black/70 p-1 border border-red-400/50 shadow-md shrink-0 flex items-center justify-center">
                      <img
                        src={companyLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-black text-sm text-white tracking-wider uppercase leading-none truncate">
                        {companyName}
                      </div>
                      <div className="text-[9px] font-bold text-red-200 tracking-widest uppercase mt-0.5">
                        ARMS CONTROL TOWER
                      </div>
                      <div className="text-[7.5px] text-red-300/80 font-mono tracking-tight uppercase truncate">
                        LEGAL & DEBT RECOVERY AGENCY
                      </div>
                    </div>
                  </div>

                  {/* Card Type Tag */}
                  <div className="mt-1.5 flex items-center justify-between border-t border-red-700/60 pt-1.5">
                    <span className="text-[8.5px] font-black text-amber-300 tracking-wider uppercase">
                      {cardTypeTitle}
                    </span>
                    <span className="text-[8px] font-mono text-red-200 bg-black/50 px-1.5 py-0.5 rounded border border-red-600/40">
                      SECURE ID
                    </span>
                  </div>
                </div>

                {/* Middle Body: Photo & Identity */}
                <div className="px-3.5 py-2 flex flex-col items-center text-center relative z-10 flex-1 justify-center space-y-1.5">
                  {/* Portrait Photo Frame with Red & Metallic Accents */}
                  <div className="relative">
                    <div className="w-28 h-36 rounded-xl p-[3px] bg-gradient-to-b from-red-500 via-red-700 to-black shadow-[0_0_15px_rgba(220,38,38,0.4)] relative">
                      <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-950 border border-red-950 flex items-center justify-center">
                        {customPhoto ? (
                          <img
                            src={customPhoto}
                            alt={personnel.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 p-2">
                            <Camera className="w-6 h-6 text-red-400 mb-0.5" />
                            <span className="text-[8px] text-slate-400 font-semibold">PAS FOTO</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 p-[1.5px] shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center text-amber-300">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="space-y-0.5 w-full">
                    <h4 className="text-base font-black text-white tracking-wide uppercase leading-tight">
                      {personnel.fullName}
                    </h4>
                    <div className="text-[11px] font-bold text-red-400 tracking-wide uppercase">
                      {personnel.position || (isKaryawan ? 'STAFF OPERASIONAL' : 'FIELD COLLECTOR')}
                    </div>
                    <div className="text-[8.5px] font-mono text-slate-400 tracking-wider uppercase">
                      {cardTypeSubtitle}
                    </div>
                  </div>

                  {/* ID & Details Key-Value Grid */}
                  <div className="w-full bg-black/70 border border-red-900/60 rounded-lg p-2 grid grid-cols-2 gap-1.5 text-left text-[9px] shadow-inner font-mono">
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">ID KARYAWAN:</span>
                      <span className="text-red-300 font-extrabold text-[10px]">{formattedId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">STATUS PAS:</span>
                      <span className="text-emerald-400 font-bold text-[9px]">● {personnel.status || 'ACTIVE'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">DIVISI / JABATAN:</span>
                      <span className="text-slate-200 font-medium truncate block">{personnel.position || (isKaryawan ? 'OPERASIONAL' : 'MITRA DC')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">BERLAKU S/D:</span>
                      <span className="text-amber-300 font-semibold">DES 2028</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Barcode & Security Strip */}
                <div className="px-3 py-2 bg-gradient-to-t from-red-950 via-black to-black border-t border-red-800/50 flex items-center justify-between relative z-10">
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
                    <span className="text-[7px] font-mono text-slate-400 tracking-widest mt-0.5">
                      {`ARMS-${formattedId.replace(/[^A-Za-z0-9]/g, '')}`}
                    </span>
                  </div>

                  <div className="w-6 h-6 bg-white p-0.5 rounded border border-red-500/40 shadow shrink-0 flex items-center justify-center">
                    <QrCode className="w-full h-full text-black" />
                  </div>
                </div>
              </div>
            )}

            {/* BACK SIDE CARD (Tampak Belakang) */}
            {(viewMode === 'BACK' || viewMode === 'BOTH') && (
              <div
                ref={backCardRef}
                className="w-[320px] h-[500px] bg-[#09090b] rounded-[22px] border-2 border-red-700/80 shadow-[0_0_25px_rgba(220,38,38,0.25)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 90%, #1f0404 0%, #09090b 70%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 border border-red-900/60 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-1 bg-black rounded-full" />
                </div>

                {/* Magnetic Stripe Graphic */}
                <div className="pt-6">
                  <div className="w-full h-9 bg-black border-y border-red-900/60 shadow-inner flex items-center px-3">
                    <div className="w-full h-1.5 bg-gradient-to-r from-red-950 via-red-800 to-black opacity-70" />
                  </div>
                </div>

                {/* Terms of Use & Security Policies */}
                <div className="px-3.5 py-2 space-y-1.5 flex-1 flex flex-col justify-center">
                  <div className="border-b border-red-800/40 pb-1 flex items-center justify-between">
                    <span className="text-[9px] font-black text-red-400 tracking-wider uppercase">
                      KETENTUAN PEMEGANG KARTU (TERMS OF USE)
                    </span>
                    <span className="text-[7.5px] font-mono text-slate-400">ARMS-SEC-V8</span>
                  </div>

                  <ol className="text-[7.5px] text-slate-300 space-y-1 list-decimal list-inside leading-normal">
                    <li>
                      Kartu ini adalah tanda pengenal resmi <span className="text-white font-bold">{companyName}</span> dan wajib dikalungkan selama bertugas.
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

                  {/* Company Address & Contacts */}
                  <div className="bg-black/70 border border-red-900/60 rounded-lg p-2 space-y-1 text-[7.5px] text-slate-300">
                    <div className="font-bold text-white text-[8.5px] flex items-center gap-1 border-b border-red-950 pb-1">
                      <Building className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">{companyName} - HEAD OFFICE</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-slate-400">{companyAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="font-mono text-red-300">{companyPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-slate-400">{companyEmail}</span>
                    </div>
                  </div>

                  {/* Official Signature & Verification Stamp Area */}
                  <div className="pt-1 flex items-end justify-between px-2">
                    <div className="text-left space-y-0.5">
                      <div className="text-[7px] text-slate-400 uppercase font-mono">Diterbitkan di:</div>
                      <div className="text-[8px] font-bold text-slate-200">Karawang, Jawa Barat</div>
                      <div className="text-[7px] text-slate-400 font-mono">ARMS Security Authority</div>
                    </div>

                    {/* Official Stamp & Director Signature */}
                    <div className="text-center relative">
                      <div className="absolute -top-3 -right-2 w-14 h-14 rounded-full border border-red-600/70 border-dashed opacity-60 flex items-center justify-center pointer-events-none rotate-[-15deg]">
                        <div className="text-[6px] font-black text-red-500 uppercase tracking-tighter text-center">
                          PT. MJT<br />VERIFIED<br />STAMP
                        </div>
                      </div>
                      <div className="w-24 h-4 border-b border-slate-600 flex items-end justify-center pb-0.5">
                        <span className="font-serif italic text-[11px] text-red-300 opacity-90">Irvan I.</span>
                      </div>
                      <div className="text-[7.5px] font-bold text-white uppercase mt-0.5">DIREKTUR UTAMA</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Holographic Brand Band */}
                <div className="px-3 py-2 bg-gradient-to-r from-red-950 via-black to-red-950 border-t border-red-800/50 flex items-center justify-between text-[7px] text-slate-400 font-mono">
                  <span>AGENCY RECOVERY MANAGEMENT SYSTEM</span>
                  <span className="text-red-400 font-bold">PROPERTY OF PT MJT</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Format kartu kompatibel dengan mesin cetak ID Card CR80 standar lanyard (85.6mm x 53.98mm).</span>
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
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download Lembar Cetak Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
