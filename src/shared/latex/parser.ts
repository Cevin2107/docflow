import type { DocumentBlock, ParseResult, TableRow, TableCell, TableBlockData } from './types.ts';

/**
 * Escapes plain user text to prevent XSS injection.
 * Does NOT affect KaTeX-generated HTML.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses inline formatting:
 * - Math $...$ or \(...\) (protected from HTML escaping)
 * - Text styling \textbf{...}, \textit{...}, \underline{...}, \texttt{...}, \emph{...}, \textcolor{...}{...}, \url{...}
 * - Markdown bold **...**, italic *...*
 */
export function parseInlineText(
  text: string, 
  renderKaTeX: (math: string, display: boolean) => string
): string {
  if (!text) return '';

  const mathPlaceholders: { id: string; html: string }[] = [];
  let counter = 0;

  const storeMath = (math: string, display: boolean) => {
    const id = `___DOCFLOW_MATH_${counter++}___`;
    mathPlaceholders.push({ id, html: renderKaTeX(math, display) });
    return id;
  };

  let s = text;
  // 1. Double backslash display math embedded in inline \\\[ ... \\\]
  s = s.replace(/\\\\\[([\s\S]*?)\\\\\]/g, (_, m) => storeMath(m, true));
  // 2. Standard display math embedded in inline \[ ... \]
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => storeMath(m, true));
  // 3. Double dollar math $$ ... $$
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => storeMath(m, true));
  // 4. Double backslash inline math \\\( ... \\\)
  s = s.replace(/\\\\\(([\s\S]*?)\\\\\)/g, (_, m) => storeMath(m, false));
  // 5. Standard inline math \( ... \)
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => storeMath(m, false));
  // 6. Single dollar math $ ... $ (must not match empty $ or escaped \$)
  s = s.replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (_, m) => storeMath(m, false));

  // 7. Escape plain user text safely
  s = escapeHtml(s);

  // 8. Text replacements & LaTeX styling
  s = s.replace(/\\(neq|ne)\b/g, '≠');
  s = s.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
  s = s.replace(/\\(textit|emph)\{([^}]+)\}/g, '<em>$2</em>');
  s = s.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
  s = s.replace(/\\texttt\{([^}]+)\}/g, '<code class="docflow-inline-code">$1</code>');
  s = s.replace(/\\textcolor\{([a-zA-Z#0-9]+)\}\{([^}]+)\}/g, '<span style="color: $1;">$2</span>');
  s = s.replace(/\\url\{([^}]+)\}/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>');

  // 9. Markdown Bold & Italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 10. LaTeX escaped special characters (\%, \&, \$, \_, \#)
  s = s.replace(/\\%/g, '%');
  s = s.replace(/\\&amp;/g, '&amp;');
  s = s.replace(/\\&#36;/g, '&#36;');
  s = s.replace(/\\_/g, '_');
  s = s.replace(/\\&#35;/g, '&#35;');

  // 11. Restore rendered math
  for (const item of mathPlaceholders) {
    s = s.replace(item.id, item.html);
  }

  return s;
}

/**
 * Expands LaTeX column repetition syntax like *{5}{c} -> ccccc
 */
function expandColSpec(rawSpec: string): string {
  let spec = rawSpec;
  // Match *{count}{columns}
  spec = spec.replace(/\*\{(\d+)\}\{([^}]+)\}/g, (_, count, pattern) => {
    return pattern.repeat(parseInt(count, 10));
  });
  return spec;
}

/**
 * Parses LaTeX tabular column specification (e.g. {|l|c|r|}, p{3cm}, @{}, *{3}{c})
 */
export function parseColAligns(rawSpec: string): ('left' | 'center' | 'right')[] {
  const spec = expandColSpec(rawSpec);
  const aligns: ('left' | 'center' | 'right')[] = [];

  let i = 0;
  while (i < spec.length) {
    const ch = spec[i];
    if (ch === 'l') {
      aligns.push('left');
      i++;
    } else if (ch === 'r') {
      aligns.push('right');
      i++;
    } else if (ch === 'c') {
      aligns.push('center');
      i++;
    } else if (ch === 'p' || ch === 'm' || ch === 'b') {
      // Paragraph column p{width} -> left aligned
      aligns.push('left');
      i++;
      if (i < spec.length && spec[i] === '{') {
        while (i < spec.length && spec[i] !== '}') i++;
        if (i < spec.length) i++; // skip '}'
      }
    } else if (ch === '@') {
      // @{suppress/custom space}
      i++;
      if (i < spec.length && spec[i] === '{') {
        while (i < spec.length && spec[i] !== '}') i++;
        if (i < spec.length) i++;
      }
    } else {
      i++;
    }
  }

  return aligns.length > 0 ? aligns : ['center', 'center', 'center'];
}

/**
 * Parses individual cell string, extracting \multicolumn and \multirow if present
 */
function parseIndividualCell(
  rawContent: string, 
  fallbackAlign: 'left' | 'center' | 'right'
): TableCell {
  const trimmed = rawContent.trim();

  // 1. Check for \multicolumn{cols}{align}{content}
  const multiColMatch = trimmed.match(/^\\multicolumn\{(\d+)\}\s*\{([^}]+)\}\s*\{([\s\S]*)\}$/);
  if (multiColMatch) {
    const cols = parseInt(multiColMatch[1], 10);
    const colAlign = parseColAligns(multiColMatch[2])[0] || fallbackAlign;
    return {
      content: multiColMatch[3].trim(),
      align: colAlign,
      colspan: cols > 1 ? cols : undefined,
    };
  }

  // 2. Check for \multirow{rows}{width}{content}
  const multiRowMatch = trimmed.match(/^\\multirow\{(\d+)\}\s*\{([^}]+)\}\s*\{([\s\S]*)\}$/);
  if (multiRowMatch) {
    const rows = parseInt(multiRowMatch[1], 10);
    return {
      content: multiRowMatch[3].trim(),
      align: fallbackAlign,
      rowspan: rows > 1 ? rows : undefined,
    };
  }

  return {
    content: trimmed,
    align: fallbackAlign,
  };
}

/**
 * Parses \begin{tabular}{spec} ... \end{tabular} body content into TableBlockData
 */
export function parseTabularContent(spec: string, body: string): TableBlockData {
  const colAligns = parseColAligns(spec);
  const rows: TableRow[] = [];

  // Remove booktabs rules and track their presence
  const hasBooktabs = body.includes('\\toprule') || body.includes('\\bottomrule') || body.includes('\\midrule');
  const cleanBody = body
    .replace(/\\cmidrule(\[[^\]]*\])?\{[^}]+\}/g, '') // remove \cmidrule{1-2}
    .replace(/\\(toprule|bottomrule)/g, '');

  // Split rows by \\ optionally followed by row vertical spacing [0.5ex]
  const rawRows = cleanBody.split(/\\\\(?:\s*\[[^\]]*\])?/g);
  let headerMarked = false;

  for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
    let rawRow = rawRows[rIdx].trim();
    if (!rawRow) continue;

    // Detect \midrule (indicates the preceding row was header)
    const rowHasMidrule = rawRow.includes('\\midrule');
    const rowHasHline = rawRow.includes('\\hline');

    // Strip line rules from content
    rawRow = rawRow.replace(/\\(midrule|hline)/g, '').trim();
    if (!rawRow) {
      if (rowHasMidrule && rows.length > 0) {
        rows[rows.length - 1].isHeader = true;
        rows[rows.length - 1].cells.forEach(c => c.isHeader = true);
        headerMarked = true;
      }
      continue;
    }

    // Split cells by & (ignoring \&)
    const rawCells = rawRow.split(/(?<!\\)&/g);
    const cells: TableCell[] = [];
    let colCursor = 0;

    for (let cIdx = 0; cIdx < rawCells.length; cIdx++) {
      const defaultAlign = colAligns[colCursor % colAligns.length] || 'center';
      const parsedCell = parseIndividualCell(rawCells[cIdx], defaultAlign);
      cells.push(parsedCell);
      colCursor += parsedCell.colspan || 1;
    }

    if (cells.length > 0) {
      const isFirstRow = rows.length === 0;
      const isHeader = (!headerMarked && isFirstRow && (rowHasHline || rowHasMidrule));
      if (isHeader) {
        cells.forEach(c => c.isHeader = true);
        headerMarked = true;
      }
      rows.push({
        cells,
        isHeader,
      });
    }

    if (rowHasMidrule && rows.length > 0) {
      rows[rows.length - 1].isHeader = true;
      rows[rows.length - 1].cells.forEach(c => c.isHeader = true);
      headerMarked = true;
    }
  }

  // If table has no explicit header lines, treat first row as header if it has cells
  if (!headerMarked && rows.length > 1 && hasBooktabs) {
    rows[0].isHeader = true;
    rows[0].cells.forEach(c => c.isHeader = true);
  }

  const colCount = rows.reduce((max, r) => {
    const sumCols = r.cells.reduce((sum, c) => sum + (c.colspan || 1), 0);
    return Math.max(max, sumCols);
  }, colAligns.length);

  return {
    rows,
    colCount,
    isBooktabs: hasBooktabs,
  };
}

/**
 * Comprehensive AST Parser for LaTeX documents, mathematical markdown, and tables
 */
export function parseLatexDocument(source: string): ParseResult {
  const warnings: string[] = [];
  const blocks: DocumentBlock[] = [];

  // Normalize escaped delimiters from markdown/chat copy-paste:
  // Convert \\[ to \[, \\] to \], \\( to \(, \\) to \)
  const normalizedSource = source.replace(/\\\\([()[\]])/g, '\\$1');

  // Extract Metadata from formal LaTeX commands (\title, \author, \date)
  const titleMatch = normalizedSource.match(/\\title\{([^}]+)\}/);
  const authorMatch = normalizedSource.match(/\\author\{([^}]+)\}/);
  const dateMatch = normalizedSource.match(/\\date\{([^}]+)\}/);

  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const author = authorMatch ? authorMatch[1].trim() : undefined;
  const date = dateMatch ? (dateMatch[1] === '\\today' ? new Date().toLocaleDateString('vi-VN') : dateMatch[1].trim()) : undefined;

  // Normalize newlines
  const lines = normalizedSource.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Skip preamble tags
    if (
      trimmed.startsWith('\\documentclass') ||
      trimmed.startsWith('\\usepackage') ||
      trimmed === '\\begin{document}' ||
      trimmed === '\\end{document}' ||
      trimmed === '\\maketitle' ||
      trimmed.startsWith('\\title{') ||
      trimmed.startsWith('\\author{') ||
      trimmed.startsWith('\\date{')
    ) {
      i++;
      continue;
    }

    // 1. Table Wrapper Environment: \begin{table}[options] ... \end{table}
    if (trimmed.startsWith('\\begin{table}') || trimmed.startsWith('\\begin{table*}')) {
      const isStar = trimmed.startsWith('\\begin{table*}');
      const endTag = isStar ? '\\end{table*}' : '\\end{table}';
      const tableBlockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        tableBlockLines.push(lines[i]);
        i++;
      }
      i++; // Skip \end{table}

      const tableContent = tableBlockLines.join('\n');
      // Extract caption and label
      const capMatch = tableContent.match(/\\caption\{([^}]+)\}/);
      const labelMatch = tableContent.match(/\\label\{([^}]+)\}/);
      const caption = capMatch ? capMatch[1] : undefined;
      const label = labelMatch ? labelMatch[1] : undefined;

      // Extract inner tabular environment
      const tabMatch = tableContent.match(/\\begin\{(tabular|tabular\*|longtable)\}(\[[^\]]*\])?\s*\{([^}]+)\}([\s\S]*?)\\end\{\1\}/);
      if (tabMatch) {
        const envType = tabMatch[1];
        const colSpec = tabMatch[3];
        const tabBody = tabMatch[4];
        const tableData = parseTabularContent(colSpec, tabBody);
        tableData.caption = caption;
        tableData.label = label;

        if (envType === 'tabular*' || envType === 'longtable') {
          warnings.push(`Môi trường '\\begin{${envType}}' được render tương thích bảng chuẩn.`);
        }

        blocks.push({
          type: 'table',
          meta: { tableData },
        });
      } else {
        // Table with no inner tabular: parse lines recursively
        const innerParsed = parseLatexDocument(tableContent);
        innerParsed.blocks.forEach(b => {
          if (b.type === 'table' && b.meta?.tableData) {
            b.meta.tableData.caption = caption;
            b.meta.tableData.label = label;
          }
          blocks.push(b);
        });
      }
      continue;
    }

    // 2. Bare Tabular Environment \begin{tabular}{spec} ... \end{tabular} or \begin{tabular*} / \begin{longtable}
    const tabStartMatch = trimmed.match(/^\\begin\{(tabular|tabular\*|longtable)\}(\[[^\]]*\])?\s*\{([^}]+)\}/);
    if (tabStartMatch) {
      const envType = tabStartMatch[1];
      const colSpec = tabStartMatch[3];
      const endTag = `\\end{${envType}}`;
      const tableLines: string[] = [];

      // Content on the same line after \begin{tabular}{...}
      const restOfLine = trimmed.replace(tabStartMatch[0], '').trim();
      if (restOfLine) tableLines.push(restOfLine);

      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        tableLines.push(lines[i]);
        i++;
      }
      i++; // Skip end tag

      const tableData = parseTabularContent(colSpec, tableLines.join(' '));
      if (envType === 'tabular*' || envType === 'longtable') {
        warnings.push(`Môi trường '\\begin{${envType}}' được render tương thích bảng chuẩn.`);
      }

      blocks.push({
        type: 'table',
        meta: { tableData },
      });
      continue;
    }

    // 3. Verbatim / lstlisting Code Environment
    if (trimmed.startsWith('\\begin{verbatim}') || trimmed.startsWith('\\begin{lstlisting}')) {
      const isLst = trimmed.startsWith('\\begin{lstlisting}');
      const endTag = isLst ? '\\end{lstlisting}' : '\\end{verbatim}';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip end tag
      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
      });
      continue;
    }

    // 4. Math Environments: align, align*, equation, equation*, gather, gather*, multline, array, bmatrix, cases...
    const mathEnvMatch = trimmed.match(/^\\begin\{(align\*?|equation\*?|gather\*?|multline\*?|array|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases)\}/);
    if (mathEnvMatch) {
      const envName = mathEnvMatch[1];
      const endTag = `\\end{${envName}}`;
      const mathLines: string[] = [trimmed];
      if (!trimmed.includes(endTag)) {
        i++;
        while (i < lines.length) {
          const l = lines[i];
          if (l.trim()) {
            mathLines.push(l.trim());
          }
          i++;
          if (l.trim().includes(endTag)) break;
        }
      } else {
        i++;
      }
      blocks.push({
        type: 'display-math',
        content: mathLines.join('\n'),
      });
      continue;
    }

    // 5. Standalone Display Math \[ ... \] or $$ ... $$
    if (trimmed.startsWith('\\[') || trimmed.startsWith('$$')) {
      const isSingleLine =
        (trimmed.startsWith('\\[') && trimmed.includes('\\]')) ||
        (trimmed.startsWith('$$') && trimmed.slice(2).includes('$$'));

      if (isSingleLine) {
        const inner = trimmed
          .replace(/^(\\\[|\$\$)/, '')
          .replace(/(\\\]|\$\$)[.,;]?\s*$/, '')
          .trim();
        blocks.push({ type: 'display-math', content: inner });
        i++;
        continue;
      }

      const mathLines: string[] = [trimmed];
      i++;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim()) {
          mathLines.push(l.trim());
        }
        i++;
        if (l.includes('\\]') || (l.includes('$$') && !l.startsWith('$$'))) {
          break;
        }
      }
      const full = mathLines
        .join('\n')
        .replace(/^(\\\[|\$\$)/, '')
        .replace(/(\\\]|\$\$)[.,;]?\s*$/, '')
        .trim();
      blocks.push({ type: 'display-math', content: full });
      continue;
    }

    // 6. Callouts / Theorem-like environments: theorem, lemma, definition, proof, example, quote
    const calloutMatch = trimmed.match(/^\\begin\{(theorem|lemma|definition|proof|example|quote)\}(?:\[([^\]]+)\])?/);
    if (calloutMatch) {
      const cType = calloutMatch[1] as any;
      const cTitle = calloutMatch[2];
      const endTag = `\\end{${cType}}`;
      const innerLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        innerLines.push(lines[i]);
        i++;
      }
      i++; // Skip end tag
      const innerParsed = parseLatexDocument(innerLines.join('\n'));
      blocks.push({
        type: cType === 'quote' ? 'quote' : 'callout',
        meta: {
          calloutType: cType,
          calloutTitle: cTitle,
        },
        innerBlocks: innerParsed.blocks,
      });
      continue;
    }

    // 7. Markdown Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l.startsWith('>')) {
          quoteLines.push(l.replace(/^>\s?/, ''));
          i++;
        } else if (l === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          quoteLines.push('');
          i++;
        } else {
          break;
        }
      }
      const innerParsed = parseLatexDocument(quoteLines.join('\n'));
      blocks.push({
        type: 'quote',
        meta: { calloutType: 'quote' },
        innerBlocks: innerParsed.blocks,
      });
      continue;
    }

    // 8. Lists: \begin{enumerate} or \begin{itemize}
    const listMatch = trimmed.match(/^\\begin\{(enumerate|itemize)\}/);
    if (listMatch) {
      const listType = listMatch[1];
      const endTag = `\\end{${listType}}`;
      const items: string[] = [];
      let currentItem = '';

      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        const l = lines[i].trim();
        if (l.startsWith('\\item')) {
          if (currentItem) items.push(currentItem);
          currentItem = l.replace(/^\\item\s*/, '');
        } else {
          currentItem += (currentItem ? ' ' : '') + l;
        }
        i++;
      }
      if (currentItem) items.push(currentItem);
      i++; // Skip end tag

      blocks.push({
        type: listType === 'enumerate' ? 'list-ordered' : 'list-unordered',
        meta: { listItems: items },
      });
      continue;
    }

    // 8b. Markdown Unordered Bullet List (* item, - item, • item) with nested indentation
    const bulletMatch = rawLine.match(/^(\s*)([*•-])\s+(.+)$/);
    if (bulletMatch) {
      const items: { content: string; level: number }[] = [];
      while (i < lines.length) {
        const lineStr = lines[i];
        const m = lineStr.match(/^(\s*)([*•-])\s+(.+)$/);
        if (m) {
          const indentStr = m[1];
          const indentWidth = indentStr.replace(/\t/g, '  ').length;
          let level = 0;
          if (indentWidth >= 4) {
            level = 2;
          } else if (indentWidth >= 2) {
            level = 1;
          }
          items.push({ content: m[3], level });
          i++;
        } else if (lineStr.trim() !== '' && items.length > 0 && /^\s{2,}\S/.test(lineStr)) {
          // Continuation line of previous list item
          items[items.length - 1].content += ' ' + lineStr.trim();
          i++;
        } else if (lineStr.trim() === '') {
          // Allow blank line if next line is also a list item
          if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)([*•-])\s+/)) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      blocks.push({
        type: 'list-unordered',
        meta: {
          structuredListItems: items,
          listItems: items.map((it) => it.content),
        },
      });
      continue;
    }

    // 8c. Markdown Ordered Numbered List (1. item, 2. item)
    const orderedMatch = rawLine.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (orderedMatch) {
      const items: { content: string; level: number }[] = [];
      while (i < lines.length) {
        const lineStr = lines[i];
        const m = lineStr.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
        if (m) {
          const indentStr = m[1];
          const indentWidth = indentStr.replace(/\t/g, '  ').length;
          let level = 0;
          if (indentWidth >= 4) {
            level = 2;
          } else if (indentWidth >= 2) {
            level = 1;
          }
          items.push({ content: m[3], level });
          i++;
        } else if (lineStr.trim() !== '' && items.length > 0 && /^\s{2,}\S/.test(lineStr)) {
          // Continuation line of previous list item
          items[items.length - 1].content += ' ' + lineStr.trim();
          i++;
        } else if (lineStr.trim() === '') {
          if (i + 1 < lines.length && lines[i + 1].match(/^(\s*)\d+[.)]\s+/)) {
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      blocks.push({
        type: 'list-ordered',
        meta: {
          structuredListItems: items,
          listItems: items.map((it) => it.content),
        },
      });
      continue;
    }

    // 9. Headings
    if (trimmed.startsWith('# ') || trimmed.startsWith('\\section{')) {
      const text = trimmed.startsWith('# ')
        ? trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\section\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h1', content: text });
      i++;
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('\\subsection{')) {
      const text = trimmed.startsWith('## ')
        ? trimmed.replace(/^##\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsection\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h2', content: text });
      i++;
      continue;
    }

    if (trimmed.startsWith('### ') || trimmed.startsWith('\\subsubsection{')) {
      const text = trimmed.startsWith('### ')
        ? trimmed.replace(/^###\s+/, '').replace(/\*\*/g, '')
        : trimmed.replace(/^\\subsubsection\{([^}]+)\}.*/, '$1');
      blocks.push({ type: 'h3', content: text });
      i++;
      continue;
    }

    // 10. Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '\\hrule' || trimmed.startsWith('\\noindent\\rule')) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 11. Check for Unsupported Environments (\begin{unknown})
    const unknownEnvMatch = trimmed.match(/^\\begin\{([^}]+)\}/);
    if (unknownEnvMatch) {
      const envName = unknownEnvMatch[1];
      warnings.push(`Môi trường '\\begin{${envName}}' chưa được hỗ trợ đầy đủ.`);
      blocks.push({
        type: 'warning',
        meta: { warningMessage: `Cảnh báo: Môi trường '\\begin{${envName}}' chưa được hỗ trợ.` },
      });
      // Skip until \end{envName} if found
      const endTag = `\\end{${envName}}`;
      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        i++;
      }
      if (i < lines.length) i++;
      continue;
    }

    // 12. Regular Paragraph
    blocks.push({
      type: 'paragraph',
      content: trimmed,
    });
    i++;
  }

  return {
    title,
    author,
    date,
    blocks,
    warnings,
  };
}
