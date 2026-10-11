import type { WatermarkOptions, WatermarkPosition } from '../types/document.ts';

/**
 * Image cache to avoid re-decoding image dataURL on every redraw
 */
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete) return Promise.resolve(cached);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Calculates anchor point coordinates based on page size and position setting
 */
function getPositionCoords(
  pos: WatermarkPosition | undefined,
  width: number,
  height: number
): { x: number; y: number } {
  switch (pos) {
    case 'top-left':
      return { x: width * 0.2, y: height * 0.15 };
    case 'top-center':
      return { x: width * 0.5, y: height * 0.12 };
    case 'top-right':
      return { x: width * 0.8, y: height * 0.15 };
    case 'bottom-left':
      return { x: width * 0.2, y: height * 0.85 };
    case 'bottom-center':
      return { x: width * 0.5, y: height * 0.88 };
    case 'bottom-right':
      return { x: width * 0.8, y: height * 0.85 };
    case 'center':
    default:
      return { x: width * 0.5, y: height * 0.5 };
  }
}

/**
 * Resolves font CSS string based on options
 */
function resolveFontString(options: WatermarkOptions, scale: number): string {
  const isBold = options.isBold ?? true;
  const isItalic = options.isItalic ?? false;
  const fontSize = (options.fontSize || 40) * scale;

  let family = 'Inter, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if (options.fontFamily === 'serif') {
    family = '"Times New Roman", Times, Georgia, serif';
  } else if (options.fontFamily === 'monospace') {
    family = '"JetBrains Mono", Consolas, Monaco, "Courier New", monospace';
  } else if (options.fontFamily === 'Impact') {
    family = 'Impact, "Arial Black", sans-serif';
  }

  const weight = isBold ? '800' : '500';
  const style = isItalic ? 'italic' : 'normal';

  return `${style} ${weight} ${fontSize}px ${family}`;
}

/**
 * Draws rounded rectangle path
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws an individual watermark item at local origin (0, 0)
 */
function drawWatermarkItem(
  ctx: CanvasRenderingContext2D,
  options: WatermarkOptions,
  scale: number,
  loadedImg: HTMLImageElement | null
) {
  const type = options.type || 'text';
  const color = options.color || '#ef4444';
  const renderStyle = options.renderStyle || 'fill';
  const strokeWidth = (options.strokeWidth || 2) * scale;

  if (type === 'image' && loadedImg) {
    const imgScale = (options.imageScale || 0.4) * scale;
    const targetW = loadedImg.width * imgScale;
    const targetH = loadedImg.height * imgScale;
    ctx.drawImage(loadedImg, -targetW / 2, -targetH / 2, targetW, targetH);
    return;
  }

  const text = (options.text || 'BẢN QUYỀN').trim();
  if (!text) return;

  ctx.font = resolveFontString(options, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const fontSize = (options.fontSize || 40) * scale;
  const textHeight = fontSize * 0.9;

  if (type === 'stamp') {
    // Stamp frame
    const padX = fontSize * 0.55;
    const padY = fontSize * 0.35;
    const boxW = textWidth + padX * 2;
    const boxH = textHeight + padY * 2;
    const boxX = -boxW / 2;
    const boxY = -boxH / 2;

    const borderStyle = options.stampBorder || 'double';
    ctx.strokeStyle = color;

    if (borderStyle === 'double') {
      ctx.lineWidth = Math.max(2, 2.5 * scale);
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8 * scale);
      ctx.stroke();

      const offset = 4 * scale;
      ctx.lineWidth = Math.max(1, 1.2 * scale);
      drawRoundedRect(ctx, boxX + offset, boxY + offset, boxW - offset * 2, boxH - offset * 2, 5 * scale);
      ctx.stroke();
    } else if (borderStyle === 'dashed') {
      ctx.lineWidth = Math.max(2, 2.5 * scale);
      ctx.setLineDash([8 * scale, 4 * scale]);
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (borderStyle !== 'none') {
      ctx.lineWidth = Math.max(2, 3 * scale);
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8 * scale);
      ctx.stroke();
    }
  }

  // Draw Text (Fill, Stroke, or Both)
  if (renderStyle === 'fill' || renderStyle === 'both') {
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
  }

  if (renderStyle === 'stroke' || renderStyle === 'both') {
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, 0, 0);
  }
}

/**
 * Universal Watermark Canvas Renderer
 * Renders identically for on-screen live preview and offscreen PDF raster embedding
 */
export async function drawWatermarkOnCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  options: WatermarkOptions,
  scale: number = 1
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear previous drawings
  ctx.clearRect(0, 0, width, height);

  if (!options) return;

  let loadedImg: HTMLImageElement | null = null;
  if (options.type === 'image' && options.imageDataUrl) {
    try {
      loadedImg = await loadImage(options.imageDataUrl);
    } catch (e) {
      console.warn('Failed to load watermark image:', e);
    }
  }

  const mode = options.mode || 'single';
  const rotationRad = ((options.rotation ?? -30) * Math.PI) / 180;
  const opacity = Math.min(1, Math.max(0, options.opacity ?? 0.25));

  ctx.save();
  ctx.globalAlpha = opacity;

  if (mode === 'tiled') {
    // Tiled Matrix Pattern across entire page
    // 1. Measure item width dynamically so text never collides or overlaps
    ctx.font = resolveFontString(options, scale);
    const text = (options.text || 'BẢN QUYỀN').trim();
    const metrics = ctx.measureText(text);
    const rawTextWidth = metrics.width || 150;
    const itemWidth = (options.type === 'image' && loadedImg)
      ? (loadedImg.width * (options.imageScale || 0.4) * scale)
      : (options.type === 'stamp' ? rawTextWidth + (options.fontSize || 36) * 1.1 * scale : rawTextWidth);

    const baseSpacing = (options.tiledSpacing || 180) * scale;
    // Horizontal step must accommodate the full width of the text plus a clear gap
    const gapX = Math.max(70 * scale, baseSpacing * 0.45);
    const stepX = itemWidth + gapX;

    // Vertical step based on font height / line spacing
    const fontSize = (options.fontSize || 36) * scale;
    const gapY = Math.max(fontSize * 2.6, baseSpacing * 0.7);
    const stepY = gapY;

    const diagonal = Math.hypot(width, height) * 1.6;

    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotationRad);

    const startX = -diagonal / 2;
    const endX = diagonal / 2;
    const startY = -diagonal / 2;
    const endY = diagonal / 2;

    let rowIndex = 0;
    for (let y = startY; y <= endY; y += stepY) {
      const xOffset = (rowIndex % 2 === 1) ? stepX * 0.5 : 0;
      for (let x = startX; x <= endX; x += stepX) {
        ctx.save();
        ctx.translate(x + xOffset, y);
        drawWatermarkItem(ctx, options, scale, loadedImg);
        ctx.restore();
      }
      rowIndex++;
    }
  } else {
    // Single placement at anchor position
    const { x, y } = getPositionCoords(options.position, width, height);

    ctx.translate(x, y);
    ctx.rotate(rotationRad);
    drawWatermarkItem(ctx, options, scale, loadedImg);
  }

  ctx.restore();
}

/**
 * Converts a Canvas to PNG bytes (Uint8Array)
 */
function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob failed'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
      }, 'image/png');
    } else {
      // Fallback via data URL
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        resolve(bytes);
      } catch (err) {
        reject(err);
      }
    }
  });
}

/**
 * Generates high-resolution PNG bytes for PDF page embedding (2x resolution for crisp 300 DPI text)
 */
export async function generateWatermarkPngBytes(
  pageWidth: number,
  pageHeight: number,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const scale = 2; // 2x supersampling for ultra-crisp vector-like raster
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pageWidth * scale);
  canvas.height = Math.round(pageHeight * scale);

  await drawWatermarkOnCanvas(canvas, canvas.width, canvas.height, options, scale);

  return await canvasToPngBytes(canvas);
}

/**
 * Parses user custom page range string like "1, 3-5, 8" into 0-indexed page numbers
 */
export function parseCustomPageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr.trim()) return [];
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(startStr) && !isNaN(endStr)) {
        const min = Math.max(1, Math.min(startStr, endStr));
        const max = Math.min(totalPages, Math.max(startStr, endStr));
        for (let i = min; i <= max; i++) {
          pages.add(i - 1);
        }
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pages.add(p - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Resolves which 0-indexed page indices should receive the watermark
 */
export function resolveTargetPages(
  totalPages: number,
  options: WatermarkOptions,
  activePageIndex: number = 0
): number[] {
  const scope = options.pageScope || (options.applyToAll ? 'all' : 'custom');

  switch (scope) {
    case 'all':
      return Array.from({ length: totalPages }, (_, i) => i);
    case 'first':
      return [0];
    case 'odd':
      // Trang 1, 3, 5 lẻ theo đánh số thực tế (index 0, 2, 4)
      return Array.from({ length: totalPages }, (_, i) => i).filter((i) => i % 2 === 0);
    case 'even':
      // Trang 2, 4, 6 chẵn (index 1, 3, 5)
      return Array.from({ length: totalPages }, (_, i) => i).filter((i) => i % 2 === 1);
    case 'custom': {
      if (options.customPageRange) {
        return parseCustomPageRange(options.customPageRange, totalPages);
      }
      return options.targetPages && options.targetPages.length > 0 
        ? options.targetPages 
        : [activePageIndex];
    }
    default:
      return Array.from({ length: totalPages }, (_, i) => i);
  }
}
