import React from 'react';
import { WordItem } from '../types';
import { DICTIONARIES } from '../constants';

interface DetailViewProps {
  wordItem: WordItem | null;
  onCloseMobile: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  wordItem,
  onCloseMobile,
}) => {
  if (!wordItem) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300 bg-gray-50/50">
        <span className="text-6xl mb-4 opacity-20">🔍</span>
        <p className="text-lg font-medium">Select a word to view details</p>
      </div>
    );
  }

  const handleOpenDict = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Mobile Close Header */}
      <div className="md:hidden p-4 border-b border-gray-100 flex items-center">
        <button onClick={onCloseMobile} className="text-slate-500 hover:bg-gray-100 p-2 rounded-lg">
          ← Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto w-full">
        {/* Word Header */}
        <div className="mb-12 text-center md:text-left">
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold tracking-wider uppercase mb-4">
            Scanned Word
          </span>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-800 tracking-tight break-words mb-4">
            {wordItem.text}
          </h1>
          <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2">
            <span>🕒 Added on</span>
            <span className="font-medium text-slate-500">
              {new Date(wordItem.timestamp).toLocaleDateString()} at {new Date(wordItem.timestamp).toLocaleTimeString()}
            </span>
          </p>
        </div>

        {/* Dictionary Actions */}
        <div className="space-y-6 mb-10">
          <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-center md:text-left mb-4">
            Select Dictionary
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {DICTIONARIES.map((dict) => (
              <button
                key={dict.name}
                onClick={() => handleOpenDict(dict.urlGen(wordItem.text))}
                className="w-full bg-white hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-500 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    📚
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg text-slate-800 group-hover:text-blue-700">{dict.name}</div>
                    <div className="text-xs text-slate-400 group-hover:text-blue-400">Open Definition</div>
                  </div>
                </div>
                <span className="text-slate-300 group-hover:text-blue-500 text-xl transform group-hover:translate-x-1 transition-all">
                  ↗
                </span>
              </button>
            ))}
          </div>
          
          <p className="text-center md:text-left text-xs text-slate-400 mt-6">
            Dictionaries open in a new browser tab
          </p>
        </div>
      </div>
    </div>
  );
};