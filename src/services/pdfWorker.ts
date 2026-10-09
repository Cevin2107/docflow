import * as pdfjsLib from 'pdfjs-dist';
// Vite URL import for worker
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Cache active loaded PDF documents to avoid re-parsing on every page flip
const docCache = new Map<string, pdfjsLib.PDFDocumentProxy>();

export async function loadPdfDocument(docId: string, data: Uint8Array): Promise<pdfjsLib.PDFDocumentProxy> {
  if (docCache.has(docId)) {
    return docCache.get(docId)!;
  }
  // Make a copy of the Uint8Array buffer to prevent detachment issues
  const copyData = new Uint8Array(data);
  const loadingTask = pdfjsLib.getDocument({
    data: copyData,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
  });
  const pdfDoc = await loadingTask.promise;
  docCache.set(docId, pdfDoc);
  return pdfDoc;
}

export function clearPdfDocCache(docId?: string) {
  if (docId) {
    const doc = docCache.get(docId);
    if (doc) {
      doc.cleanup();
      docCache.delete(docId);
    }
  } else {
    docCache.forEach((doc) => doc.cleanup());
    docCache.clear();
  }
}

/**
 * Gets page base dimensions (unscaled)
 */
export async function getPageDimensions(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  rotation: number = 0
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
  return { width: viewport.width, height: viewport.height };
}

/**
 * Renders a specific page to an HTML Canvas with render cancellation support
 */
export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number, // 0-indexed
  canvas: HTMLCanvasElement,
  scale: number = 1.0,
  rotation: number = 0,
  onTaskCreated?: (task: any) => void
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  // Handle device pixel ratio for super-crisp rendering
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  };

  const renderTask = (page.render as any)(renderContext);
  if (onTaskCreated) {
    onTaskCreated(renderTask);
  }

  try {
    await renderTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      // Ignored: expected when cancellation occurs
      return { width: viewport.width, height: viewport.height };
    }
    throw err;
  }

  return { width: viewport.width, height: viewport.height };
}

/**
 * Generates a thumbnail image Data URL for a page
 */
export async function generatePageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  rotation: number = 0,
  maxWidth: number = 160
): Promise<string> {
  try {
    const page = await pdfDoc.getPage(pageIndex + 1);
    const totalRotation = (page.rotate + rotation) % 360;
    const baseViewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
    const scale = maxWidth / baseViewport.width;
    const viewport = page.getViewport({ scale, rotation: totalRotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await (page.render as any)({
      canvasContext: ctx,
      viewport,
      canvas,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn(`Failed thumbnail for page ${pageIndex + 1}`, err);
    return '';
  }
}

/**
 * Extracts plain text from a page
 */
export async function extractPageText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number
): Promise<string> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const textContent = await page.getTextContent();
  return textContent.items
    .map((item) => ('str' in item ? (item as { str: string }).str : ''))
    .join(' ');
}

/**
 * Checks if a page is blank (very little text and low pixel variation)
 */
export async function isPageBlank(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number
): Promise<boolean> {
  const text = await extractPageText(pdfDoc, pageIndex);
  if (text.trim().length > 10) {
    return false;
  }

  // Check canvas pixels
  const page = await pdfDoc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 0.3 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.trim().length === 0;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  let nonWhitePixels = 0;
  const totalPixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 240 || g < 240 || b < 240) {
      nonWhitePixels++;
    }
  }

  return nonWhitePixels / totalPixels < 0.001;
}
