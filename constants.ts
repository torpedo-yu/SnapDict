import { DictionaryConfig, DictionaryType } from './types';

export const DICTIONARIES: DictionaryConfig[] = [
  {
    name: DictionaryType.CAMBRIDGE,
    urlGen: (w) => `https://dictionary.cambridge.org/dictionary/english/${w}`,
  },
  {
    name: DictionaryType.MERRIAM_WEBSTER,
    urlGen: (w) => `https://www.merriam-webster.com/dictionary/${w}`,
  },
  {
    name: DictionaryType.LONGMAN,
    urlGen: (w) => `https://www.ldoceonline.com/dictionary/${w}`,
  },
];

export const STORAGE_KEY_HISTORY = 'snapdict_history_v1';