import { compressPdf } from './pdfEngine';

/**
 * Uploads a PDF to pone.rs with automatic background compression.
 * Returns the public direct link from pone.rs.
 */
export async function sharePdfViaPone(
  pdfBytes: Uint8Array,
  fileName: string = 'document.pdf'
): Promise<string> {
  // 1. Background optimization & compression to minimize upload time & bandwidth
  let uploadBytes = pdfBytes;
  try {
    if (pdfBytes.length > 30 * 1024) {
      uploadBytes = await compressPdf(pdfBytes, 'balanced');
    }
  } catch (err) {
    console.warn('Background compression skipped, proceeding with original bytes', err);
    uploadBytes = pdfBytes;
  }

  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = new Blob([uploadBytes as any], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('files[]', blob, safeName);

  // 2. Try proxy endpoint first (avoids browser CORS), fallback to direct URL
  const endpoints = ['/api/pone-upload?output=text', 'https://pone.rs/upload?output=text'];
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const text = await response.text();
      const trimmed = text.trim();

      // pone.rs returns raw URL when ?output=text (e.g. https://u.pone.rs/cqzpjpgo.pdf)
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }

      // If response is JSON
      try {
        const json = JSON.parse(trimmed);
        if (json.files && json.files[0]?.url) {
          return json.files[0].url;
        }
      } catch {
        // Not JSON
      }

      if (trimmed.length > 5) {
        return trimmed;
      }
    } catch (err: any) {
      lastError = err;
      // continue to next endpoint
    }
  }

  throw lastError || new Error('Không thể kết nối tới dịch vụ chia sẻ pone.rs');
}
