export type ToolType = 
  | 'overview'
  | 'merge' 
  | 'split' 
  | 'compress' 
  | 'sign' 
  | 'latex'
  | 'pdf-to-word'
  | 'protect'
  | 'edit'
  | 'pdf-to-image' 
  | 'image-to-pdf'
  | 'page-numbers' 
  | 'watermark' 
  | 'remove-blank'
  | 'text-extract';

export interface DocPage {
  pageId: string;             // Stable unique ID
  sourceDocId: string;        // ID of the source PDF document
  sourceDocName: string;      // Original filename
  sourcePageIndex: number;    // 0-indexed page number in the original PDF
  rotation: number;           // 0, 90, 180, 270 degrees
  thumbnailUrl?: string;      // Cached canvas thumbnail data URL
  width?: number;
  height?: number;
}

export interface DocFlowDocument {
  id: string;
  name: string;
  fileSize: number;
  data: Uint8Array;           // Binary PDF data
  pages: DocPage[];
  updatedAt: number;
}

export interface SplitGroup {
  id: string;
  name: string;
  pageIds: string[];          // References to DocPage.pageId
}

export interface SplitResultFile {
  id: string;
  name: string;
  pageCount: number;
  data: Uint8Array;
  thumbnailUrl?: string;
}

export interface RevisionSnapshot {
  revisionId: string;
  parentRevisionId: string | null;
  actionName: string;
  timestamp: number;
  document: DocFlowDocument;
}

export type CompressionLevel = 'low' | 'balanced' | 'high';

export interface SignatureItem {
  id: string;
  type: 'draw' | 'type' | 'image';
  dataUrl: string;
  pageIndex: number;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number;
  height: number;
  signerName?: string;
  dateStr?: string;
}

export interface EditAnnotation {
  id: string;
  type: 'text' | 'rect' | 'highlight' | 'redact';
  pageIndex: number;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number;
  height: number;
  color: string;
  text?: string;
  fontSize?: number;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  applyToAll: boolean;
  targetPages: number[];
}

export interface PageNumberOptions {
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format: 'number-only' | 'page-of-total' | 'custom';
  prefix: string;
  fontSize: number;
  color: string;
  startNumber: number;
  margin: number;
}
