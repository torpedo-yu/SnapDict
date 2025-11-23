export interface WordItem {
  id: string;
  text: string;
  timestamp: number;
}

export enum DictionaryType {
  CAMBRIDGE = 'Cambridge',
  MERRIAM_WEBSTER = 'Merriam-Webster',
  LONGMAN = 'Longman'
}

export interface DictionaryConfig {
  name: DictionaryType;
  urlGen: (word: string) => string;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text: string;
  originalText: string;
}
