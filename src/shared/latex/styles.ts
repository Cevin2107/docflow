import type { DocumentOptions } from './types.ts';
import { KATEX_BASE_CSS } from './katexCss.ts';

/**
 * Returns complete scoped CSS string for LaTeX document rendering in both Preview and PDF print
 */
export function getSharedLatexStyles(options?: DocumentOptions): string {
  const paper = options?.paperSize || 'A4';
  const orientation = options?.orientation || 'portrait';
  const top = options?.margins?.top || '20mm';
  const bottom = options?.margins?.bottom || '18mm';
  const left = options?.margins?.left || '18mm';
  const right = options?.margins?.right || '18mm';
  const fontSize = options?.fontSize || '11pt';

  return `
/* --- Embedded KaTeX Core CSS (Zero External CDN Dependency) --- */
${KATEX_BASE_CSS}

/* Base Document Variables & Reset */
:root {
  --docflow-font-size: ${fontSize};
  --docflow-primary: #1e3a8a;
  --docflow-text: #0f172a;
  --docflow-border: #cbd5e1;
  --docflow-bg-soft: #f8fafc;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--docflow-text);
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Page Setup for Print Media */
@page {
  size: ${paper} ${orientation};
  margin: ${top} ${right} ${bottom} ${left};
}

@media print {
  html, body {
    background: #ffffff !important;
    color: #0f172a !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .docflow-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  /* Orphan & Widow protection */
  p, div, li, blockquote {
    orphans: 3;
    widows: 3;
  }

  /* Break inside rules */
  tr, .docflow-avoid-break, .docflow-short-box {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Break after rules for headings */
  h1, h2, h3, h4, .docflow-h1, .docflow-h2, .docflow-h3 {
    break-after: avoid !important;
    page-break-after: avoid !important;
  }

  /* Allow long blockquotes / boxes to break naturally across pages */
  .docflow-quote, .docflow-callout {
    break-inside: auto !important;
  }

  /* Table repeating header */
  thead {
    display: table-header-group !important;
  }
  
  tfoot {
    display: table-footer-group !important;
  }
}

/* Document Container Layout */
.docflow-container {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  font-size: var(--docflow-font-size);
  line-height: 1.65;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}

/* Typography */
.docflow-h1 {
  font-size: 1.85em;
  font-weight: 800;
  color: #1e293b;
  margin: 1.2em 0 0.4em 0;
  padding-bottom: 0.25em;
  border-bottom: 2px solid #e2e8f0;
  text-align: center;
}

.docflow-h2 {
  font-size: 1.35em;
  font-weight: 700;
  color: #1e3a8a;
  margin: 1.1em 0 0.35em 0;
  padding-bottom: 0.2em;
  border-bottom: 1px solid #e2e8f0;
}

.docflow-h3 {
  font-size: 1.1em;
  font-weight: 600;
  color: #334155;
  margin: 0.9em 0 0.3em 0;
}

.docflow-p {
  margin: 0.6em 0;
  line-height: 1.65;
  text-align: justify;
}

/* Document Header */
.docflow-header {
  text-align: center;
  margin-bottom: 2em;
  padding-bottom: 1.2em;
  border-bottom: 2px solid #e2e8f0;
}

.docflow-title {
  font-size: 2.1em;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 0.3em 0;
  line-height: 1.25;
}

.docflow-meta {
  font-size: 0.9em;
  color: #64748b;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5em;
  flex-wrap: wrap;
}

/* KaTeX Mathematics Styling & Fraction Normalization */
.katex-display {
  margin: 0.8em 0 !important;
  text-align: center !important;
  overflow: visible !important;
}

.katex {
  font-size: 1.05em;
  text-rendering: geometricPrecision;
}

/* CRITICAL: Fraction line alignment & thickness stabilization */
.katex .frac-line {
  border-bottom-width: 1.5px !important;
  min-height: 1.5px !important;
  transform: translateZ(0); /* Prevent subpixel shift */
}

.katex .katex-html {
  display: inline-block !important;
}

.katex .katex-mathml {
  display: none !important;
}

/* Prevent KaTeX square root SVG from blowing up table widths */
.katex .hide-tail {
  overflow: hidden !important;
  max-width: 100% !important;
}

.katex .svg-align {
  max-width: 100% !important;
}

/* Math container wrapper for auto-fit */
.docflow-math-display {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 1em 0;
  padding: 0.8em 1em;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: center;
  overflow-x: auto;
  overflow-y: visible !important;
}

.docflow-math-display > .katex-display {
  margin: 0 !important;
  max-width: 100%;
}

/* KaTeX Table / Array Cell Breathing Room */
.katex .mtable {
  border-collapse: collapse;
}

.katex .mtable .arraycolsep {
  width: 0.85em !important;
  display: inline-block !important;
}

.katex .mtable .vertical-separator {
  box-sizing: border-box;
}

/* Crisp typography for Vietnamese text inside KaTeX formulas */
.katex .text,
.katex .mathrm,
.katex .textrm {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
}

/* Auto-fit container wrapper */
.docflow-autofit-wrap {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 1em 0;
  position: relative;
}

/* Table Styling */
.docflow-table-wrapper {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  margin: 1em 0;
  overflow-x: auto;
}

.docflow-table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  box-sizing: border-box;
  font-size: 0.92em;
  margin: 0 auto;
}

.docflow-table th,
.docflow-table td {
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  word-break: break-word;
  overflow-wrap: anywhere;
  vertical-align: middle;
}

.docflow-table th {
  background-color: #f1f5f9;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
}

.docflow-table-caption {
  caption-side: top;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.6em;
  font-size: 0.95em;
  text-align: center;
}

/* Booktabs clean academic styling */
.docflow-table-booktabs {
  border-top: 2px solid #0f172a !important;
  border-bottom: 2px solid #0f172a !important;
  border-left: none !important;
  border-right: none !important;
}

.docflow-table-booktabs th {
  border-top: none !important;
  border-left: none !important;
  border-right: none !important;
  border-bottom: 1.5px solid #0f172a !important;
  background-color: transparent !important;
}

.docflow-table-booktabs td {
  border: none !important;
  border-bottom: 1px solid #f1f5f9 !important;
}

.docflow-table-booktabs tr:nth-child(even) td {
  background-color: transparent !important;
}

.docflow-table-align-left { text-align: left; }
.docflow-table-align-center { text-align: center; }
.docflow-table-align-right { text-align: right; }

/* Callout & Blockquote */
.docflow-quote {
  margin: 1em 0;
  padding: 0.8em 1.2em;
  border-left: 4px solid #6366f1;
  background-color: #f5f3ff;
  border-radius: 0 8px 8px 0;
  box-sizing: border-box;
  min-width: 0;
  overflow-wrap: anywhere;
}

.docflow-callout {
  margin: 1.1em 0;
  padding: 1em 1.2em;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  box-sizing: border-box;
  min-width: 0;
  overflow-wrap: anywhere;
}

.docflow-callout-header {
  font-weight: 700;
  margin-bottom: 0.4em;
  font-size: 0.95em;
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.docflow-callout-theorem {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1e3a8a;
}
.docflow-callout-theorem .docflow-callout-header { color: #1d4ed8; }

.docflow-callout-definition {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
  color: #14532d;
}
.docflow-callout-definition .docflow-callout-header { color: #15803d; }

.docflow-callout-proof {
  background-color: #f8fafc;
  border-color: #e2e8f0;
  font-style: italic;
}
.docflow-callout-proof .docflow-callout-header { font-style: normal; color: #475569; }

/* Code Blocks */
.docflow-code {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 1em;
  border-radius: 8px;
  font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
  font-size: 0.88em;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
  margin: 1em 0;
}

.docflow-inline-code {
  background-color: #f1f5f9;
  color: #0f172a;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 0.9em;
  border: 1px solid #e2e8f0;
}

/* Lists */
/* Lists & Nested Indentation */
.docflow-list-ordered,
.docflow-list-unordered {
  margin: 0.7em 0;
  padding-left: 0;
  list-style: none;
}

.docflow-list-item {
  position: relative;
  padding-left: 1.6em;
  margin: 0.4em 0;
  line-height: 1.65;
  text-align: left;
}

.docflow-list-item.docflow-has-custom-label {
  padding-left: 0.2em;
}

.docflow-list-item.docflow-has-custom-label::before {
  content: none !important;
  display: none !important;
}

.docflow-custom-bullet {
  display: inline-block;
  min-width: 1.4em;
  font-weight: 700;
  color: #1e3a8a;
  margin-right: 0.45em;
  text-align: left;
}

/* Level 0: Chấm tròn to ở đầu dòng */
.docflow-list-unordered > .docflow-list-item::before {
  content: "•";
  position: absolute;
  left: 0.3em;
  top: -0.05em;
  font-size: 1.35em;
  color: #1e3a8a;
  line-height: 1;
  font-weight: 800;
}

/* Level 1: Thụt lề cấp 2 với phân cấp rõ ràng */
.docflow-list-item.docflow-list-level-1 {
  margin-left: 2em !important;
  padding-left: 1.4em !important;
  color: #334155;
}

.docflow-list-unordered > .docflow-list-item.docflow-list-level-1::before {
  content: "–";
  position: absolute;
  left: 0.15em;
  top: -0.05em;
  font-size: 1.15em;
  color: #64748b;
  font-weight: 700;
}

/* Level 2: Thụt lề cấp 3 */
.docflow-list-item.docflow-list-level-2 {
  margin-left: 3.8em !important;
  padding-left: 1.4em !important;
  color: #475569;
}

.docflow-list-unordered > .docflow-list-item.docflow-list-level-2::before {
  content: "▪";
  position: absolute;
  left: 0.3em;
  font-size: 0.85em;
  color: #94a3b8;
}

.docflow-list-ordered {
  counter-reset: docflow-ordered-counter;
}

.docflow-list-ordered > .docflow-list-item {
  counter-increment: docflow-ordered-counter;
  padding-left: 1.8em;
}

.docflow-list-ordered > .docflow-list-item::before {
  content: counter(docflow-ordered-counter) ".";
  position: absolute;
  left: 0;
  top: 0;
  font-weight: 700;
  color: #1e3a8a;
}

/* Warnings */
.docflow-warning {
  margin: 0.8em 0;
  padding: 0.7em 1em;
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  color: #92400e;
  font-size: 0.88em;
  display: flex;
  align-items: center;
  gap: 0.6em;
}

.docflow-fit-warning {
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  font-size: 11px;
  border-radius: 4px;
  text-align: center;
}

.docflow-hr {
  border: 0;
  border-top: 1px solid #e2e8f0;
  margin: 1.5em 0;
}
  `;
}
