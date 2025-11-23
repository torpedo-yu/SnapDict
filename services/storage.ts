import { WordItem } from '../types';
import { STORAGE_KEY_HISTORY } from '../constants';

export const getHistory = (): WordItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveWord = (text: string): WordItem[] => {
  const cleanText = text.trim();
  if (!cleanText) return getHistory();

  // Fix: Append random string to timestamp to ensure unique IDs during batch operations
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const newItem: WordItem = {
    id: uniqueId,
    text: cleanText.charAt(0).toUpperCase() + cleanText.slice(1),
    timestamp: Date.now(),
  };

  const currentHistory = getHistory();
  // Filter duplicates (case insensitive) and limit to 50 items
  const filtered = currentHistory.filter(item => item.text.toLowerCase() !== cleanText.toLowerCase());
  const newHistory = [newItem, ...filtered].slice(0, 50);

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
  return newHistory;
};

export const updateWord = (id: string, newText: string): WordItem[] => {
  const cleanText = newText.trim();
  if (!cleanText) return getHistory();

  const currentHistory = getHistory();
  const newHistory = currentHistory.map(item => {
    if (item.id === id) {
      return { ...item, text: cleanText };
    }
    return item;
  });

  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
  return newHistory;
};

export const deleteWord = (id: string): WordItem[] => {
  const currentHistory = getHistory();
  const newHistory = currentHistory.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
  return newHistory;
};