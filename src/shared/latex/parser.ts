import type { DocumentBlock, ParseResult, TableRow, TableCell, TableBlockData, ListItemData } from './types.ts';

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

  // 10b. Clean any stray list environment commands that were not part of a list block
  s = s.replace(/\\(begin|end)\{(itemize|enumerate|description)\}/g, '');
  s = s.replace(/\\item(?:\[[^\]]*\])?\s*/g, '• ');

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
 * Extracts the first balanced braced group { ... } from the start of a string
 */
export function extractFirstBracedGroup(str: string): { content: string; rest: string } {
  const trimmed = str.trimStart();
  if (!trimmed.startsWith('{')) {
    return { content: '', rest: str };
  }

  let depth = 0;
  const startIdx = str.indexOf('{');
  let endIdx = -1;

  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return {
      content: str.slice(startIdx + 1, endIdx),
      rest: str.slice(endIdx + 1),
    };
  }

  return { content: '', rest: str };
}

/**
 * Tokenizes LaTeX list environment body into structured items with nesting levels
 */
export function extractLatexListItems(body: string): ListItemData[] {
  // Protect math formulas from being split
  const mathPlaceholders: { id: string; val: string }[] = [];
  let mCounter = 0;
  let protectedBody = body;

  protectedBody = protectedBody.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => {
    const id = `___MATH_DISP_${mCounter++}___`;
    mathPlaceholders.push({ id, val: `\\[${m}\\]` });
    return id;
  });
  protectedBody = protectedBody.replace(/\$\$([\s\S]*?)\$\$/g, (_, m) => {
    const id = `___MATH_DISP_${mCounter++}___`;
    mathPlaceholders.push({ id, val: `$$${m}$$` });
    return id;
  });
  protectedBody = protectedBody.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => {
    const id = `___MATH_INL_${mCounter++}___`;
    mathPlaceholders.push({ id, val: `\\(${m}\\)` });
    return id;
  });
  protectedBody = protectedBody.replace(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, (_, m) => {
    const id = `___MATH_INL_${mCounter++}___`;
    mathPlaceholders.push({ id, val: `$${m}$` });
    return id;
  });

  const lines = protectedBody.split('\n');
  const items: ListItemData[] = [];
  let currentLevel = 0;
  let currentItemText = '';
  let currentLabel: string | undefined = undefined;

  const pushCurrent = () => {
    if (currentItemText.trim() || currentLabel) {
      let restored = currentItemText.trim();
      for (const p of mathPlaceholders) {
        restored = restored.replace(p.id, p.val);
      }
      let restoredLabel = currentLabel;
      if (restoredLabel) {
        for (const p of mathPlaceholders) {
          restoredLabel = restoredLabel.replace(p.id, p.val);
        }
      }
      items.push({
        content: restored,
        level: currentLevel,
        label: restoredLabel,
      });
      currentItemText = '';
      currentLabel = undefined;
    }
  };

  for (const rawL of lines) {
    const l = rawL.trim();
    if (!l) continue;

    const tokenRegex = /(\\begin\{(?:itemize|enumerate|description)\}(?:\[[^\]]*\])?|\\end\{(?:itemize|enumerate|description)\}|\\item(?:\[[^\]]*\])?)/g;
    let lastPos = 0;
    let match: RegExpExecArray | null;
    const tokens: { type: 'tag' | 'text'; val: string }[] = [];

    while ((match = tokenRegex.exec(l)) !== null) {
      if (match.index > lastPos) {
        tokens.push({ type: 'text', val: l.slice(lastPos, match.index) });
      }
      tokens.push({ type: 'tag', val: match[0] });
      lastPos = match.index + match[0].length;
    }
    if (lastPos < l.length) {
      tokens.push({ type: 'text', val: l.slice(lastPos) });
    }

    if (tokens.length === 0) {
      currentItemText += (currentItemText ? ' ' : '') + l;
      continue;
    }

    for (const t of tokens) {
      if (t.type === 'tag') {
        if (t.val.startsWith('\\begin{')) {
          pushCurrent();
          currentLevel++;
        } else if (t.val.startsWith('\\end{')) {
          pushCurrent();
          currentLevel = Math.max(0, currentLevel - 1);
        } else if (t.val.startsWith('\\item')) {
          pushCurrent();
          const itemOptMatch = t.val.match(/^\\item\[([^\]]*)\]/);
          if (itemOptMatch) {
            currentLabel = itemOptMatch[1].trim();
          }
        }
      } else {
        currentItemText += (currentItemText ? ' ' : '') + t.val.trim();
      }
    }
  }

  pushCurrent();
  return items;
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

    // Pre-check: If line has text before environments, split it
    const inlineEnvStart = trimmed.match(/^(.*?)(\\begin\{(?:itemize|enumerate|description|tabular|tabular\*|longtable|table|table\*|center)\}.*)$/);
    if (inlineEnvStart && inlineEnvStart[1].trim() && !trimmed.startsWith('\\begin{') && !trimmed.startsWith('\\[')) {
      blocks.push({
        type: 'paragraph',
        content: inlineEnvStart[1].trim(),
      });
      lines[i] = inlineEnvStart[2].trim();
      continue;
    }

    // Skip LaTeX layout / alignment commands
    if (
      trimmed === '\\centering' ||
      trimmed === '\\raggedright' ||
      trimmed === '\\raggedleft' ||
      trimmed === '\\noindent' ||
      trimmed === '\\bigskip' ||
      trimmed === '\\medskip' ||
      trimmed === '\\smallskip' ||
      trimmed === '\\newpage' ||
      trimmed === '\\clearpage'
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

      const cleanTableContent = tableContent
        .replace(/\\caption\{[^}]+\}/g, '')
        .replace(/\\label\{[^}]+\}/g, '');

      const innerParsed = parseLatexDocument(cleanTableContent);
      let foundTable = false;
      innerParsed.blocks.forEach(b => {
        if (b.type === 'table' && b.meta?.tableData) {
          if (!b.meta.tableData.caption) b.meta.tableData.caption = caption;
          if (!b.meta.tableData.label) b.meta.tableData.label = label;
          foundTable = true;
        }
        blocks.push(b);
      });
      continue;
    }

    // 2. Tabular Environment: \begin{tabular}, \begin{tabular*}, \begin{longtable}
    const tabMatch = trimmed.match(/^\\begin\{(tabular|tabular\*|longtable)\}/);
    if (tabMatch) {
      const envType = tabMatch[1];
      const endTag = `\\end{${envType}}`;
      const tableLines: string[] = [];

      let firstLineRest = trimmed.slice(tabMatch[0].length);
      tableLines.push(firstLineRest);

      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        tableLines.push(lines[i]);
        i++;
      }

      if (i < lines.length) {
        const closingLine = lines[i];
        const endIdx = closingLine.indexOf(endTag);
        if (endIdx > 0) {
          tableLines.push(closingLine.slice(0, endIdx));
        }
        i++; // Skip end tag
      }

      let rawContent = tableLines.join('\n').trim();

      // Skip optional alignment parameter [t|b|c]
      rawContent = rawContent.replace(/^\s*\[[^\]]*\]/, '').trim();

      // If tabular*, extract width parameter first
      if (envType === 'tabular*') {
        const widthExtraction = extractFirstBracedGroup(rawContent);
        rawContent = widthExtraction.rest.trim();
      }

      // Extract colSpec
      const specExtraction = extractFirstBracedGroup(rawContent);
      const colSpec = specExtraction.content;
      const tableBody = specExtraction.rest;

      const tableData = parseTabularContent(colSpec, tableBody);
      if (envType === 'tabular*' || envType === 'longtable') {
        warnings.push(`Môi trường '\\begin{${envType}}' được render tương thích bảng chuẩn.`);
      }

      blocks.push({
        type: 'table',
        meta: { tableData },
      });
      continue;
    }

    // 2b. Alignment environments: center, flushleft, flushright
    const alignEnvMatch = trimmed.match(/^\\begin\{(center|flushleft|flushright)\}/);
    if (alignEnvMatch) {
      const envType = alignEnvMatch[1];
      const endTag = `\\end{${envType}}`;
      const innerLines: string[] = [];

      const afterBegin = trimmed.slice(alignEnvMatch[0].length).trim();
      if (afterBegin && !afterBegin.includes(endTag)) {
        innerLines.push(afterBegin);
      }

      i++;
      while (i < lines.length && !lines[i].trim().includes(endTag)) {
        innerLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        const closingLine = lines[i];
        const endIdx = closingLine.indexOf(endTag);
        if (endIdx > 0) {
          innerLines.push(closingLine.slice(0, endIdx));
        }
        i++; // Skip \end{...}
      }

      const innerParsed = parseLatexDocument(innerLines.join('\n'));
      innerParsed.blocks.forEach((b) => blocks.push(b));
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

    // 8. Lists: \begin{enumerate}, \begin{itemize}, or \begin{description}
    const listStartMatch = trimmed.match(/^\\begin\{(enumerate|itemize|description)\}(?:\[[^\]]*\])?/);
    if (listStartMatch) {
      const rootListType = listStartMatch[1];
      let depth = 0;
      const collectedSegments: string[] = [];
      let remainingAfterEnd = '';

      const beginRegex = /\\begin\{(itemize|enumerate|description)\}(?:\[[^\]]*\])?/g;
      const endRegex = /\\end\{(itemize|enumerate|description)\}/g;

      while (i < lines.length) {
        const line = lines[i];
        beginRegex.lastIndex = 0;
        endRegex.lastIndex = 0;

        const events: { type: 'begin' | 'end'; env: string; index: number; length: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = beginRegex.exec(line)) !== null) {
          events.push({ type: 'begin', env: m[1], index: m.index, length: m[0].length });
        }
        while ((m = endRegex.exec(line)) !== null) {
          events.push({ type: 'end', env: m[1], index: m.index, length: m[0].length });
        }
        events.sort((a, b) => a.index - b.index);

        if (events.length === 0) {
          collectedSegments.push(line);
          i++;
          continue;
        }

        let lastIdx = 0;
        let lineFinished = false;

        for (const ev of events) {
          if (ev.type === 'begin') {
            depth++;
            if (depth === 1) {
              lastIdx = ev.index + ev.length;
            } else {
              collectedSegments.push(line.slice(lastIdx, ev.index + ev.length));
              lastIdx = ev.index + ev.length;
            }
          } else if (ev.type === 'end') {
            depth--;
            if (depth <= 0) {
              collectedSegments.push(line.slice(lastIdx, ev.index));
              remainingAfterEnd = line.slice(ev.index + ev.length).trim();
              lineFinished = true;
              break;
            } else {
              collectedSegments.push(line.slice(lastIdx, ev.index + ev.length));
              lastIdx = ev.index + ev.length;
            }
          }
        }

        if (lineFinished) {
          i++;
          break;
        } else {
          if (lastIdx < line.length) {
            collectedSegments.push(line.slice(lastIdx));
          }
          i++;
        }
      }

      const rawBody = collectedSegments.join('\n');
      const structuredItems = extractLatexListItems(rawBody);

      blocks.push({
        type: rootListType === 'enumerate' ? 'list-ordered' : 'list-unordered',
        meta: {
          structuredListItems: structuredItems,
          listItems: structuredItems.map((it) => it.content),
        },
      });

      if (remainingAfterEnd) {
        lines.splice(i, 0, remainingAfterEnd);
      }
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

    // 8d. Loose LaTeX \item outside list environment
    const looseItemMatch = trimmed.match(/^\\item(?:\[([^\]]*)\])?\s*(.*)$/);
    if (looseItemMatch) {
      const items: ListItemData[] = [];
      while (i < lines.length) {
        const lineStr = lines[i].trim();
        const m = lineStr.match(/^\\item(?:\[([^\]]*)\])?\s*(.*)$/);
        if (m) {
          items.push({
            content: m[2] || '',
            level: 0,
            label: m[1]?.trim() || undefined,
          });
          i++;
        } else if (lineStr !== '' && items.length > 0 && !lineStr.startsWith('\\') && !lineStr.startsWith('#')) {
          items[items.length - 1].content += ' ' + lineStr;
          i++;
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

    // 11b. Ignore isolated stray list tags if any
    if (trimmed.match(/^\\(begin|end)\{(itemize|enumerate|description)\}$/)) {
      i++;
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
