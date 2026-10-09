/**
 * Formats byte size into human readable string (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parses and validates page ranges such as "1-3, 5-7, 9-13" or "1, 4, 8-10"
 * Returns list of 1-based page numbers.
 */
export function parsePageRangeString(
  input: string,
  totalPages: number
): { pages: number[]; error?: string; warnings?: string[] } {
  if (!input || !input.trim()) {
    return { pages: [], error: 'Vui lòng nhập khoảng trang (ví dụ: 1-3, 5-7, 9)' };
  }

  const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
  const selectedPages: number[] = [];
  const warnings: string[] = [];
  const seenPages = new Set<number>();

  for (const part of parts) {
    if (part.includes('-')) {
      const rangeParts = part.split('-').map((s) => s.trim());
      if (rangeParts.length !== 2) {
        return { pages: [], error: `Khoảng trang không hợp lệ: "${part}"` };
      }
      const start = parseInt(rangeParts[0], 10);
      const end = parseInt(rangeParts[1], 10);

      if (isNaN(start) || isNaN(end)) {
        return { pages: [], error: `Khoảng trang chứa ký tự không phải số: "${part}"` };
      }
      if (start <= 0 || end <= 0) {
        return { pages: [], error: `Số trang phải lớn hơn 0 trong khoảng: "${part}"` };
      }
      if (start > end) {
        return {
          pages: [],
          error: `Khoảng đảo ngược không hợp lệ: "${part}" (trang bắt đầu lớn hơn kết thúc)`,
        };
      }
      if (start > totalPages || end > totalPages) {
        warnings.push(`Khoảng "${part}" vượt quá tổng số trang (${totalPages}).`);
      }

      const clampedEnd = Math.min(end, totalPages);
      for (let i = start; i <= clampedEnd; i++) {
        if (i <= totalPages) {
          if (seenPages.has(i)) {
            warnings.push(`Trang ${i} bị trùng lặp.`);
          }
          seenPages.add(i);
          selectedPages.push(i);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum)) {
        return { pages: [], error: `Trang không hợp lệ: "${part}"` };
      }
      if (pageNum <= 0) {
        return { pages: [], error: `Số trang phải lớn hơn 0: "${part}"` };
      }
      if (pageNum > totalPages) {
        warnings.push(`Trang ${pageNum} vượt quá tổng số trang (${totalPages}).`);
      } else {
        if (seenPages.has(pageNum)) {
          warnings.push(`Trang ${pageNum} bị trùng lặp.`);
        }
        seenPages.add(pageNum);
        selectedPages.push(pageNum);
      }
    }
  }

  if (selectedPages.length === 0) {
    return { pages: [], error: 'Không có trang hợp lệ nào trong khoảng đã chọn.' };
  }

  return { pages: selectedPages, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Converts a list of 1-based page numbers into a compact human-readable range string
 * Example: [1, 2, 3, 5, 7, 8, 9] -> "1-3, 5, 7-9"
 */
export function pageNumbersToRangeString(pageNumbers: number[]): string {
  if (!pageNumbers || pageNumbers.length === 0) return '';
  const sorted = Array.from(new Set(pageNumbers)).filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return '';

  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
      rangeStart = curr;
      prev = curr;
    }
  }
  ranges.push(rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`);
  return ranges.join(', ');
}

/**
 * Sanitizes a file name for safe download
 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Creates standardized output file names according to PRD section 10
 */
export function getOutputName(
  baseName: string,
  action: 'merged' | 'split' | 'part' | 'compressed' | 'signed' | 'numbered' | 'watermarked' | 'extracted',
  suffix?: string | number,
  ext: string = 'pdf'
): string {
  const cleanBase = baseName.replace(/\.[^/.]+$/, '');
  if (action === 'part' && suffix !== undefined) {
    const padNum = String(suffix).padStart(2, '0');
    return `${cleanBase}_part_${padNum}.${ext}`;
  }
  if (suffix !== undefined) {
    return `${cleanBase}_${action}_${suffix}.${ext}`;
  }
  return `${cleanBase}_${action}.${ext}`;
}

/**
 * Strips Vietnamese diacritics and converts to standard ASCII characters
 * to ensure 100% compatibility with standard PDF fonts (Helvetica, Times).
 */
export function removeDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^\x00-\x7F]/g, '');
}
