export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AutoCropResult {
  url: string;
  originalUrl: string;
  didCrop: boolean;
  cropBox?: CropBox;
  originalDimensions: { width: number; height: number };
}

/**
 * Loads an image from a URL/DataURI into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Automatically detects document boundaries (e.g. KTP, STNK, paper sheets on desk/table/scanner)
 * and crops out irrelevant surrounding background.
 */
export async function autoCropDocumentImage(
  dataUrl: string,
  options: {
    sensitivity?: 'low' | 'medium' | 'high';
    safetyPaddingPercent?: number; // small padding so text/borders are never clipped (default 1.5%)
  } = {}
): Promise<AutoCropResult> {
  try {
    const img = await loadImage(dataUrl);
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    if (!origW || !origH || origW < 50 || origH < 50) {
      return { url: dataUrl, originalUrl: dataUrl, didCrop: false, originalDimensions: { width: origW, height: origH } };
    }

    // Downscale for fast, noise-resistant boundary detection
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const sw = Math.max(50, Math.round(origW * scale));
    const sh = Math.max(50, Math.round(origH * scale));

    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = sw;
    analysisCanvas.height = sh;
    const ctx = analysisCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { url: dataUrl, originalUrl: dataUrl, didCrop: false, originalDimensions: { width: origW, height: origH } };
    }

    ctx.drawImage(img, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // 1. Analyze 4 corners and outer edges to determine background color profile
    const cornerSize = Math.max(4, Math.min(16, Math.floor(Math.min(sw, sh) * 0.05)));
    
    // Sample corners (TL, TR, BL, BR)
    const sampleBox = (startX: number, startY: number, sizeX: number, sizeY: number) => {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let y = startY; y < startY + sizeY; y++) {
        for (let x = startX; x < startX + sizeX; x++) {
          const idx = (y * sw + x) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }
      return { r: rSum / count, g: gSum / count, b: bSum / count };
    };

    const tl = sampleBox(0, 0, cornerSize, cornerSize);
    const tr = sampleBox(sw - cornerSize, 0, cornerSize, cornerSize);
    const bl = sampleBox(0, sh - cornerSize, cornerSize, cornerSize);
    const br = sampleBox(sw - cornerSize, sh - cornerSize, cornerSize, cornerSize);

    // Also sample the outer 3% margin edge bars
    const topBar = sampleBox(cornerSize, 0, sw - 2 * cornerSize, Math.max(2, Math.floor(sh * 0.025)));
    const botBar = sampleBox(cornerSize, sh - Math.max(2, Math.floor(sh * 0.025)), sw - 2 * cornerSize, Math.max(2, Math.floor(sh * 0.025)));
    const leftBar = sampleBox(0, cornerSize, Math.max(2, Math.floor(sw * 0.025)), sh - 2 * cornerSize);
    const rightBar = sampleBox(sw - Math.max(2, Math.floor(sw * 0.025)), cornerSize, Math.max(2, Math.floor(sw * 0.025)), sh - 2 * cornerSize);

    const bgColors = [tl, tr, bl, br, topBar, botBar, leftBar, rightBar];

    // Compute color distance function from nearest background color
    const colorDist = (r: number, g: number, b: number) => {
      let minDist = 999999;
      for (const bg of bgColors) {
        const d = Math.sqrt(
          (r - bg.r) * (r - bg.r) * 1.0 +
          (g - bg.g) * (g - bg.g) * 1.2 +
          (b - bg.b) * (b - bg.b) * 0.8
        );
        if (d < minDist) minDist = d;
      }
      return minDist;
    };

    // Sensitivity thresholds
    const sens = options.sensitivity || 'medium';
    let distThreshold = 26; // color distance from background
    let minRowColRatio = 0.12; // fraction of row/col that must differ from background
    if (sens === 'low') {
      distThreshold = 35;
      minRowColRatio = 0.18;
    } else if (sens === 'high') {
      distThreshold = 18;
      minRowColRatio = 0.08;
    }

    // Build foreground mask and calculate row/column activity
    // We also compute local gradient (Sobel-like) to detect document borders
    const isDocPixel: boolean[][] = [];
    for (let y = 0; y < sh; y++) {
      isDocPixel[y] = new Array(sw).fill(false);
    }

    const rowCounts = new Int32Array(sh);
    const colCounts = new Int32Array(sw);

    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Background color difference
        const dist = colorDist(r, g, b);

        // Gradient magnitude
        const leftIdx = (y * sw + (x - 1)) * 4;
        const rightIdx = (y * sw + (x + 1)) * 4;
        const upIdx = ((y - 1) * sw + x) * 4;
        const downIdx = ((y + 1) * sw + x) * 4;

        const gradX = Math.abs(data[rightIdx] - data[leftIdx]) +
                      Math.abs(data[rightIdx + 1] - data[leftIdx + 1]) +
                      Math.abs(data[rightIdx + 2] - data[leftIdx + 2]);
        const gradY = Math.abs(data[downIdx] - data[upIdx]) +
                      Math.abs(data[downIdx + 1] - data[upIdx + 1]) +
                      Math.abs(data[downIdx + 2] - data[upIdx + 2]);

        const totalGrad = (gradX + gradY) / 3;

        // A pixel is considered document foreground if:
        // 1. Its color is noticeably different from edge background colors
        // OR 2. It has strong gradient / edge contrast (text, card border, signature, etc.)
        if (dist > distThreshold || totalGrad > 32) {
          isDocPixel[y][x] = true;
          rowCounts[y]++;
          colCounts[x]++;
        }
      }
    }

    // Scan inward from each of the 4 borders to detect document boundaries
    const minPixelRow = Math.max(3, Math.round(sw * minRowColRatio));
    const minPixelCol = Math.max(3, Math.round(sh * minRowColRatio));

    // Top boundary (scan down)
    let topY = 0;
    for (let y = 0; y < Math.floor(sh * 0.45); y++) {
      if (rowCounts[y] >= minPixelRow) {
        // Look ahead 2 rows to avoid single-row noise
        if (rowCounts[Math.min(sh - 1, y + 1)] >= minPixelRow * 0.8) {
          topY = y;
          break;
        }
      }
    }

    // Bottom boundary (scan up)
    let botY = sh - 1;
    for (let y = sh - 1; y >= Math.floor(sh * 0.55); y--) {
      if (rowCounts[y] >= minPixelRow) {
        if (rowCounts[Math.max(0, y - 1)] >= minPixelRow * 0.8) {
          botY = y;
          break;
        }
      }
    }

    // Left boundary (scan right)
    let leftX = 0;
    for (let x = 0; x < Math.floor(sw * 0.45); x++) {
      if (colCounts[x] >= minPixelCol) {
        if (colCounts[Math.min(sw - 1, x + 1)] >= minPixelCol * 0.8) {
          leftX = x;
          break;
        }
      }
    }

    // Right boundary (scan left)
    let rightX = sw - 1;
    for (let x = sw - 1; x >= Math.floor(sw * 0.55); x--) {
      if (colCounts[x] >= minPixelCol) {
        if (colCounts[Math.max(0, x - 1)] >= minPixelCol * 0.8) {
          rightX = x;
          break;
        }
      }
    }

    // Add safety padding (default 1.5% to 2%) so document edges and text aren't cut off
    const paddingPercent = options.safetyPaddingPercent !== undefined ? options.safetyPaddingPercent : 1.5;
    const padX = Math.round(sw * (paddingPercent / 100));
    const padY = Math.round(sh * (paddingPercent / 100));

    leftX = Math.max(0, leftX - padX);
    topY = Math.max(0, topY - padY);
    rightX = Math.min(sw - 1, rightX + padX);
    botY = Math.min(sh - 1, botY + padY);

    const cropBoxAnalysisW = rightX - leftX + 1;
    const cropBoxAnalysisH = botY - topY + 1;

    // Check if the detected crop area is meaningful:
    // 1. Must cut off at least 3% of total margin space on at least one edge or combined area
    const marginCutLeft = leftX / sw;
    const marginCutTop = topY / sh;
    const marginCutRight = (sw - 1 - rightX) / sw;
    const marginCutBot = (sh - 1 - botY) / sh;
    const totalMarginCut = marginCutLeft + marginCutTop + marginCutRight + marginCutBot;

    const areaRatio = (cropBoxAnalysisW * cropBoxAnalysisH) / (sw * sh);

    // If area is unreasonably small (< 15% of original image) or barely anything was cropped (< 3% total cut),
    // don't perform destructive crop
    if (totalMarginCut < 0.035 || areaRatio < 0.15 || areaRatio > 0.985) {
      return {
        url: dataUrl,
        originalUrl: dataUrl,
        didCrop: false,
        originalDimensions: { width: origW, height: origH }
      };
    }

    // Map back to original full-resolution image coordinates
    const invScale = 1 / scale;
    const origCropX = Math.max(0, Math.round(leftX * invScale));
    const origCropY = Math.max(0, Math.round(topY * invScale));
    const origCropW = Math.min(origW - origCropX, Math.round(cropBoxAnalysisW * invScale));
    const origCropH = Math.min(origH - origCropY, Math.round(cropBoxAnalysisH * invScale));

    if (origCropW <= 50 || origCropH <= 50) {
      return {
        url: dataUrl,
        originalUrl: dataUrl,
        didCrop: false,
        originalDimensions: { width: origW, height: origH }
      };
    }

    // Perform high-quality crop on full-resolution canvas
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = origCropW;
    croppedCanvas.height = origCropH;
    const cropCtx = croppedCanvas.getContext('2d');
    if (!cropCtx) {
      return { url: dataUrl, originalUrl: dataUrl, didCrop: false, originalDimensions: { width: origW, height: origH } };
    }

    // Enable high quality image smoothing and fill white background for transparent images
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.fillStyle = '#FFFFFF';
    cropCtx.fillRect(0, 0, origCropW, origCropH);
    cropCtx.drawImage(
      img,
      origCropX, origCropY, origCropW, origCropH,
      0, 0, origCropW, origCropH
    );

    const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg', 0.92);

    return {
      url: croppedDataUrl,
      originalUrl: dataUrl,
      didCrop: true,
      cropBox: {
        x: origCropX,
        y: origCropY,
        width: origCropW,
        height: origCropH
      },
      originalDimensions: { width: origW, height: origH }
    };
  } catch (err) {
    console.error('Error during document auto crop:', err);
    return {
      url: dataUrl,
      originalUrl: dataUrl,
      didCrop: false,
      originalDimensions: { width: 0, height: 0 }
    };
  }
}

/**
 * Manually crops an image using specific coordinates
 */
export async function cropImageManually(
  dataUrl: string,
  box: CropBox
): Promise<string> {
  const img = await loadImage(dataUrl);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const validX = Math.max(0, Math.min(box.x, origW - 10));
  const validY = Math.max(0, Math.min(box.y, origH - 10));
  const validW = Math.max(10, Math.min(box.width, origW - validX));
  const validH = Math.max(10, Math.min(box.height, origH - validY));

  const canvas = document.createElement('canvas');
  canvas.width = validW;
  canvas.height = validH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, validW, validH);
  ctx.drawImage(img, validX, validY, validW, validH, 0, 0, validW, validH);

  return canvas.toDataURL('image/jpeg', 0.92);
}
