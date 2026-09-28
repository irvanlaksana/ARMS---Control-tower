import React, { useState, useEffect, useRef } from 'react';
import { Scissors, RefreshCw, Undo2, Check, X, Sliders, AlertCircle } from 'lucide-react';
import { autoCropDocumentImage, loadImage, CropBox } from '../utils/imageAutoCrop';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  originalUrl?: string;
  onSaveCrop: (croppedUrl: string) => void;
  onRestoreOriginal?: () => void;
}

export default function ImageCropModal({
  isOpen,
  onClose,
  imageUrl,
  originalUrl,
  onSaveCrop,
  onRestoreOriginal,
}: ImageCropModalProps) {
  const baseImgUrl = originalUrl || imageUrl;
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  const [sensitivity, setSensitivity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadImage(baseImgUrl).then((img) => {
        setOriginalDims({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
        setPreviewUrl(imageUrl);
      }).catch(err => console.error('Failed to load image for crop:', err));
    }
  }, [isOpen, baseImgUrl, imageUrl]);

  // Update preview whenever margin sliders change
  const generatePreview = async (topPct: number, botPct: number, leftPct: number, rightPct: number) => {
    if (!originalDims.width || !originalDims.height) return;
    try {
      const img = await loadImage(baseImgUrl);
      const w = originalDims.width;
      const h = originalDims.height;

      const cropX = Math.round((leftPct / 100) * w);
      const cropY = Math.round((topPct / 100) * h);
      const cropW = Math.max(10, Math.round(w - cropX - (rightPct / 100) * w));
      const cropH = Math.max(10, Math.round(h - cropY - (botPct / 100) * h));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAutoCrop = async (selectedSens: 'low' | 'medium' | 'high' = sensitivity) => {
    setIsAutoDetecting(true);
    try {
      const res = await autoCropDocumentImage(baseImgUrl, { sensitivity: selectedSens });
      if (res.didCrop && res.cropBox && res.originalDimensions) {
        const ow = res.originalDimensions.width;
        const oh = res.originalDimensions.height;
        const topPct = Number(((res.cropBox.y / oh) * 100).toFixed(1));
        const botPct = Number((((oh - (res.cropBox.y + res.cropBox.height)) / oh) * 100).toFixed(1));
        const leftPct = Number(((res.cropBox.x / ow) * 100).toFixed(1));
        const rightPct = Number((((ow - (res.cropBox.x + res.cropBox.width)) / ow) * 100).toFixed(1));

        setCropTop(topPct);
        setCropBottom(botPct);
        setCropLeft(leftPct);
        setCropRight(rightPct);
        setPreviewUrl(res.url);
      } else {
        // Did not detect substantial border
        alert('Tepi dokumen sudah pas atau latar belakang tidak terdeteksi kontras tinggi. Anda dapat memotong manual menggunakan pengatur tepi di bawah.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleSliderChange = (type: 'top' | 'bottom' | 'left' | 'right', val: number) => {
    let t = cropTop, b = cropBottom, l = cropLeft, r = cropRight;
    if (type === 'top') { t = val; setCropTop(val); }
    if (type === 'bottom') { b = val; setCropBottom(val); }
    if (type === 'left') { l = val; setCropLeft(val); }
    if (type === 'right') { r = val; setCropRight(val); }
    generatePreview(t, b, l, r);
  };

  const handleResetSliders = () => {
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
    setPreviewUrl(baseImgUrl);
  };

  const handleSave = () => {
    onSaveCrop(previewUrl);
    onClose();
  };

  const handleRestore = () => {
    if (onRestoreOriginal) {
      onRestoreOriginal();
    } else {
      onSaveCrop(baseImgUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#5A5A40]/10 rounded-lg text-[#5A5A40]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Potong & Rapikan Background Dokumen</h3>
              <p className="text-xs text-slate-500">Hilangkan latar belakang meja, lantai, atau tepi dokumen yang tidak penting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1">
          {/* Quick Auto-Detect Toolbar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Sensitivitas:</span>
              <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 text-xs font-medium">
                {(['low', 'medium', 'high'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSensitivity(s);
                      handleRunAutoCrop(s);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      sensitivity === s
                        ? 'bg-[#5A5A40] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'low' ? 'Longgar' : s === 'medium' ? 'Standar' : 'Ketat (Maksimal)'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRunAutoCrop(sensitivity)}
              disabled={isAutoDetecting}
              className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#484833] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoDetecting ? 'animate-spin' : ''}`} />
              <span>{isAutoDetecting ? 'Mendeteksi...' : '✂️ Auto-Crop Otomatis'}</span>
            </button>
          </div>

          {/* Image Preview Window with Cut Indicators */}
          <div className="relative bg-slate-950/5 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center min-h-[220px]">
            <div className="relative max-h-[300px] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Crop preview"
                className="max-h-[280px] max-w-full object-contain rounded-lg shadow-sm border border-slate-300 bg-white"
              />
            </div>
            <div className="mt-2 text-[11px] text-slate-500 font-medium text-center flex items-center gap-2">
              <span>Hasil Potong Siap Digunakan</span>
              {(cropTop > 0 || cropBottom > 0 || cropLeft > 0 || cropRight > 0) && (
                <span className="text-[#5A5A40] font-bold">
                  (Dipotong: T:{cropTop}% B:{cropBottom}% Kiri:{cropLeft}% Kanan:{cropRight}%)
                </span>
              )}
            </div>
          </div>

          {/* Manual Fine-Tuning Sliders */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#5A5A40]" />
                <span>Penyesuaian Manual Tepi Background</span>
              </span>
              <button
                type="button"
                onClick={handleResetSliders}
                className="text-[11px] text-[#5A5A40] hover:underline font-bold cursor-pointer"
              >
                Reset Tepi ke 0%
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Potong Atas</span>
                  <span>{cropTop}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.5"
                  value={cropTop}
                  onChange={(e) => handleSliderChange('top', Number(e.target.value))}
                  className="w-full accent-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Potong Bawah</span>
                  <span>{cropBottom}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.5"
                  value={cropBottom}
                  onChange={(e) => handleSliderChange('bottom', Number(e.target.value))}
                  className="w-full accent-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Potong Kiri</span>
                  <span>{cropLeft}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.5"
                  value={cropLeft}
                  onChange={(e) => handleSliderChange('left', Number(e.target.value))}
                  className="w-full accent-[#5A5A40]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5">
                  <span>Potong Kanan</span>
                  <span>{cropRight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.5"
                  value={cropRight}
                  onChange={(e) => handleSliderChange('right', Number(e.target.value))}
                  className="w-full accent-[#5A5A40]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleRestore}
            className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kembalikan ke foto awal tanpa dipotong sama sekali"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Kembalikan Foto Asli</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold text-white bg-[#5A5A40] hover:bg-[#484833] rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Terapkan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
