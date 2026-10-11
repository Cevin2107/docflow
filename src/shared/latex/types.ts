export interface DocumentMarginOptions {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export interface DocumentOptions {
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: DocumentMarginOptions;
  fontSize?: '10pt' | '11pt' | '12pt';
  pageNumbers?: boolean;
  documentTitle?: string;
  author?: string;
  date?: string;
}

export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'display-math'
  | 'table'
  | 'code'
  | 'quote'
  | 'callout'
  | 'list-ordered'
  | 'list-unordered'
  | 'hr'
  | 'warning';

export interface TableCell {
  content: string;
  align: 'left' | 'center' | 'right';
  isHeader?: boolean;
  colspan?: number;
  rowspan?: number;
}

export interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

export interface TableBlockData {
  rows: TableRow[];
  caption?: string;
  label?: string;
  colCount: number;
  isBooktabs?: boolean;
}

export interface ListItemData {
  content: string;
  level: number;
}

export interface DocumentBlock {
  type: BlockType;
  content?: string;
  meta?: {
    calloutType?: 'theorem' | 'lemma' | 'definition' | 'proof' | 'example' | 'quote';
    calloutTitle?: string;
    codeLang?: string;
    warningMessage?: string;
    tableData?: TableBlockData;
    listItems?: string[];
    structuredListItems?: ListItemData[];
  };
  innerBlocks?: DocumentBlock[];
}

export interface ParseResult {
  title?: string;
  author?: string;
  date?: string;
  blocks: DocumentBlock[];
  warnings: string[];
}

export const LATEX_TYPES_VERSION = '1.0.0';
