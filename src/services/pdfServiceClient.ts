import type { DocumentOptions } from '../shared/latex/types.ts';

const DEFAULT_SERVICE_URL = 'http://localhost:3001/api/render-pdf';

/**
 * Checks if the standalone PDF renderer service is healthy and available
 */
export async function checkPdfServiceHealth(): Promise<boolean> {
  const serviceUrl = import.meta.env.VITE_PDF_API_URL || DEFAULT_SERVICE_URL;
  try {
    const healthUrl = serviceUrl.replace(/\/api\/render-pdf\/?$/, '/health');
    const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(2500) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Sends LaTeX source code to the standalone Chromium PDF Service
 * Returns high-fidelity vector PDF bytes
 */
export async function renderLatexViaService(
  code: string,
  options?: DocumentOptions
): Promise<Uint8Array> {
  const serviceUrl = import.meta.env.VITE_PDF_API_URL || DEFAULT_SERVICE_URL;

  const res = await fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, options }),
    signal: AbortSignal.timeout(45000), // 45s client timeout
  });

  if (!res.ok) {
    let errMsg = `Lỗi máy chủ (${res.status})`;
    try {
      const errJson = await res.json();
      errMsg = errJson.error || errJson.message || errMsg;
    } catch {
      // fallback
    }
    throw new Error(errMsg);
  }

  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
