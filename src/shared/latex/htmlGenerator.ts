import katex from 'katex';
import type { DocumentOptions, DocumentBlock, TableBlockData } from './types.ts';
import { parseLatexDocument, parseInlineText, escapeHtml } from './parser.ts';
import { getSharedLatexStyles } from './styles.ts';
import { AUTO_FIT_SCRIPT } from './autoFitScript.ts';

/**
 * Safely renders LaTeX math expression with KaTeX without throwing
 */
export function safeRenderKaTeX(mathExpr: string, displayMode: boolean): string {
  try {
    let clean = mathExpr.trim();
    // Normalize top-level math environments for KaTeX compatibility
    clean = clean.replace(/\\begin\{align\*?\}/g, '\\begin{aligned}');
    clean = clean.replace(/\\end\{align\*?\}/g, '\\end{aligned}');
    clean = clean.replace(/\\begin\{gather\*?\}/g, '\\begin{gathered}');
    clean = clean.replace(/\\end\{gather\*?\}/g, '\\end{gathered}');

    // 1. Transform single-column / equation bmatrix (used as "dấu hoặc" [ disjunction in Vietnamese math)
    // into standard left-bracket notation with ample vertical spacing (1.8) and left alignment
    clean = clean.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_, body) => {
      // If it contains column separator '&' and no equation symbols, keep as standard matrix
      if (body.includes('&') && !/[=<>≤≥≠≈]/.test(body)) {
        return `{\\def\\arraystretch{1.45}\\begin{bmatrix}${body}\\end{bmatrix}}`;
      }
      return `{\\def\\arraystretch{1.8}\\left[ \\begin{array}{l} ${body.trim()} \\end{array} \\right.}`;
    });

    // 2. Transform cases environment (used as "dấu và" { conjunction in Vietnamese math)
    // into standard left-brace notation with ample vertical spacing (1.8) and left alignment
    clean = clean.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, body) => {
      const colSpec = body.includes('&') ? 'll' : 'l';
      return `{\\def\\arraystretch{1.8}\\left\\{ \\begin{array}{${colSpec}} ${body.trim()} \\end{array} \\right.}`;
    });

    // 3. Ensure any explicit left[ or left\{ array has spacious 1.8 row stretch
    clean = clean.replace(/(\\left\s*(?:\[|\\\{))\s*(\\begin\{array\}\{[^}]+\}[\s\S]*?\\end\{array\})\s*(\\right\.)/g, 
      '{\\def\\arraystretch{1.8}$1 $2 $3}'
    );

    // 4. Standalone table / matrix arrays (tabular-like or arrays without delimiters)
    if (clean.includes('\\begin{array}') && !clean.includes('\\arraystretch')) {
      clean = clean.replace(/\\begin\{array\}/g, '{\\def\\arraystretch{1.55}\\begin{array}');
      clean = clean.replace(/\\end\{array\}/g, '\\end{array}}');
    }

    // 5. Matrix inside left bracket
    if ((clean.includes('\\left[') || clean.includes('\\left\\{')) && clean.includes('\\begin{matrix}') && !clean.includes('\\arraystretch')) {
      clean = clean.replace(/\\begin\{matrix\}/g, '{\\def\\arraystretch{1.8}\\begin{array}{l}');
      clean = clean.replace(/\\end\{matrix\}/g, '\\end{array}}');
    }

    let rendered = katex.renderToString(clean, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html', // Pure HTML output prevents MathML double-drawn artifact
    });

    // Fix KaTeX Private Use Area glyph \uE020 for \neq / \ne:
    // KaTeX outputs a composite \uE020 lap overlaid on =. We replace the entire construct with clean Unicode ≠
    rendered = rendered.replace(
      /<span class="mrel"><span class="mrel"><span class="mord katex-vbox">[\s\S]*?<\/span><\/span><span class="mspace nobreak"><\/span><span class="mrel">=<\/span>/g,
      '<span class="mrel">≠</span>'
    );
    // Replace any remaining PUA \uE020 with ≠
    rendered = rendered.replace(/\uE020/g, '≠');
    return rendered;
  } catch (err: any) {
    const safeText = escapeHtml(mathExpr);
    return `<span class="katex-fallback text-red-600 font-mono text-xs">[Lỗi công thức: ${safeText}]</span>`;
  }
}

/**
 * Renders individual DocumentBlock to semantic HTML
 */
export function renderBlockToHtml(block: DocumentBlock): string {
  switch (block.type) {
    case 'h1': {
      const inline = parseInlineText(block.content || '', safeRenderKaTeX);
      return `<h1 class="docflow-h1">${inline}</h1>`;
    }

    case 'h2': {
      const inline = parseInlineText(block.content || '', safeRenderKaTeX);
      return `<h2 class="docflow-h2">${inline}</h2>`;
    }

    case 'h3': {
      const inline = parseInlineText(block.content || '', safeRenderKaTeX);
      return `<h3 class="docflow-h3">${inline}</h3>`;
    }

    case 'paragraph': {
      const inline = parseInlineText(block.content || '', safeRenderKaTeX);
      return `<p class="docflow-p">${inline}</p>`;
    }

    case 'display-math': {
      const mathHtml = safeRenderKaTeX(block.content || '', true);
      return `
        <div class="docflow-autofit-wrap">
          <div class="docflow-math-display docflow-autofit-target">
            ${mathHtml}
          </div>
        </div>
      `;
    }

    case 'table': {
      const data: TableBlockData | undefined = block.meta?.tableData;
      if (!data || data.rows.length === 0) return '';

      const captionHtml = data.caption
        ? `<caption class="docflow-table-caption">${parseInlineText(data.caption, safeRenderKaTeX)}</caption>`
        : '';

      const rowsHtml = data.rows
        .map((row) => {
          const cellsHtml = row.cells
            .map((cell) => {
              const tag = cell.isHeader ? 'th' : 'td';
              const alignClass = `docflow-table-align-${cell.align}`;
              const colspanAttr = cell.colspan && cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
              const rowspanAttr = cell.rowspan && cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';
              const content = parseInlineText(cell.content, safeRenderKaTeX);
              return `<${tag} class="${alignClass}"${colspanAttr}${rowspanAttr}>${content}</${tag}>`;
            })
            .join('');

          return `<tr>${cellsHtml}</tr>`;
        })
        .join('');

      const tableClass = `docflow-table docflow-autofit-target ${data.isBooktabs ? 'docflow-table-booktabs' : ''}`.trim();

      return `
        <div class="docflow-table-wrapper docflow-autofit-wrap">
          <table class="${tableClass}">
            ${captionHtml}
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    case 'code': {
      const escaped = escapeHtml(block.content || '');
      return `<pre class="docflow-code"><code>${escaped}</code></pre>`;
    }

    case 'quote': {
      const innerHtml = block.innerBlocks ? block.innerBlocks.map(renderBlockToHtml).join('\n') : '';
      return `<blockquote class="docflow-quote">${innerHtml}</blockquote>`;
    }

    case 'callout': {
      const cType = block.meta?.calloutType || 'theorem';
      const cTitle = block.meta?.calloutTitle;
      const typeLabels: Record<string, string> = {
        theorem: 'Định lý',
        lemma: 'Bổ đề',
        definition: 'Định nghĩa',
        proof: 'Chứng minh',
        example: 'Ví dụ',
      };
      const headerLabel = typeLabels[cType] || 'Ghi chú';
      const fullHeader = cTitle ? `${headerLabel} (${escapeHtml(cTitle)})` : headerLabel;

      const innerHtml = block.innerBlocks ? block.innerBlocks.map(renderBlockToHtml).join('\n') : '';

      return `
        <div class="docflow-callout docflow-callout-${cType}">
          <div class="docflow-callout-header">
            <span>§</span>
            <span>${fullHeader}</span>
          </div>
          <div class="docflow-callout-body">
            ${innerHtml}
          </div>
        </div>
      `;
    }

    case 'list-ordered': {
      const structured = block.meta?.structuredListItems;
      if (structured && structured.length > 0) {
        const itemsHtml = structured
          .map((item) => {
            const levelClass = item.level > 0 ? ` docflow-list-level-${item.level}` : '';
            if (item.label) {
              return `<li class="docflow-list-item${levelClass} docflow-has-custom-label"><span class="docflow-custom-bullet">${parseInlineText(item.label, safeRenderKaTeX)}</span><span class="docflow-item-body">${parseInlineText(item.content, safeRenderKaTeX)}</span></li>`;
            }
            return `<li class="docflow-list-item${levelClass}">${parseInlineText(item.content, safeRenderKaTeX)}</li>`;
          })
          .join('\n');
        return `<ol class="docflow-list-ordered">${itemsHtml}</ol>`;
      }

      const items = block.meta?.listItems || [];
      const itemsHtml = items
        .map((item) => `<li class="docflow-list-item">${parseInlineText(item, safeRenderKaTeX)}</li>`)
        .join('\n');
      return `<ol class="docflow-list-ordered">${itemsHtml}</ol>`;
    }

    case 'list-unordered': {
      const structured = block.meta?.structuredListItems;
      if (structured && structured.length > 0) {
        const itemsHtml = structured
          .map((item) => {
            const levelClass = item.level > 0 ? ` docflow-list-level-${item.level}` : '';
            if (item.label) {
              return `<li class="docflow-list-item${levelClass} docflow-has-custom-label"><span class="docflow-custom-bullet">${parseInlineText(item.label, safeRenderKaTeX)}</span><span class="docflow-item-body">${parseInlineText(item.content, safeRenderKaTeX)}</span></li>`;
            }
            return `<li class="docflow-list-item${levelClass}">${parseInlineText(item.content, safeRenderKaTeX)}</li>`;
          })
          .join('\n');
        return `<ul class="docflow-list-unordered">${itemsHtml}</ul>`;
      }

      const items = block.meta?.listItems || [];
      const itemsHtml = items
        .map((item) => `<li class="docflow-list-item">${parseInlineText(item, safeRenderKaTeX)}</li>`)
        .join('\n');
      return `<ul class="docflow-list-unordered">${itemsHtml}</ul>`;
    }

    case 'hr': {
      return `<hr class="docflow-hr" />`;
    }

    case 'warning': {
      const msg = escapeHtml(block.meta?.warningMessage || 'Cảnh báo cú pháp');
      return `
        <div class="docflow-warning">
          <span>⚠️</span>
          <span>${msg}</span>
        </div>
      `;
    }

    default:
      return '';
  }
}

/**
 * Generates snippet HTML inside container for live preview
 */
export function generateDocumentBodyHtml(
  code: string, 
  options?: DocumentOptions,
  includeStyles: boolean = true
): string {
  const parsed = parseLatexDocument(code);
  const title = options?.documentTitle || parsed.title;
  const author = options?.author || parsed.author;
  const date = options?.date || parsed.date;

  // Filter out any duplicate h1 block at the beginning of the body that matches the header title
  const bodyBlocks = parsed.blocks
    .filter((block, idx) => {
      if (idx === 0 && block.type === 'h1' && title && block.content) {
        const cleanA = block.content.trim().toLowerCase().replace(/[\s\-_]+/g, '');
        const cleanB = title.trim().toLowerCase().replace(/[\s\-_]+/g, '');
        if (cleanA === cleanB) return false;
      }
      return true;
    })
    .map(renderBlockToHtml)
    .join('\n');
  const sharedCss = includeStyles ? getSharedLatexStyles(options) : '';

  return `
    ${includeStyles ? `<style>${sharedCss}</style>` : ''}
    <div class="docflow-container">
      ${title ? `
        <header class="docflow-header">
          <h1 class="docflow-title">${escapeHtml(title)}</h1>
          ${(author || date) ? `
            <div class="docflow-meta">
              ${author ? `<span>Tác giả: <strong>${escapeHtml(author)}</strong></span>` : ''}
              ${(author && date) ? `<span>•</span>` : ''}
              ${date ? `<span>Ngày: ${escapeHtml(date)}</span>` : ''}
            </div>
          ` : ''}
        </header>
      ` : ''}

      <div class="docflow-body">
        ${bodyBlocks}
      </div>
    </div>
  `;
}

/**
 * Generates COMPLETE standalone HTML document for Headless Chromium / Print
 * Includes inline CSS, KaTeX font-faces, and the auto-fit script
 */
export function generateDocumentHtml(code: string, options?: DocumentOptions): string {
  const bodyHtml = generateDocumentBodyHtml(code, options, false);
  const sharedCss = getSharedLatexStyles(options);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="/" />
  <title>${escapeHtml(options?.documentTitle || 'DocFlow LaTeX Document')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.19.0/dist/katex.min.css" integrity="sha384-HZwT+N9D5tZz+q4N+q8V3jW8kX5s6e5+U+U3N7y0u6a0=" crossorigin="anonymous">
  <style>
    ${sharedCss}
  </style>
</head>
<body>
  ${bodyHtml}
  <script>
    ${AUTO_FIT_SCRIPT}
  </script>
</body>
</html>`;
}
