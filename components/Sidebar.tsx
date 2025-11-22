import React, { useState } from 'react';
import { WordItem } from '../types';

interface SidebarProps {
  history: WordItem[];
  selectedId: string | null;
  onSelectWord: (word: WordItem) => void;
  onScanClick: () => void;
  onManualAdd: (text: string) => void;
  onEditWord: (id: string, newText: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  selectedId,
  onSelectWord,
  onScanClick,
  onManualAdd,
  onEditWord,
}) => {
  // State for manual add input
  const [manualInput, setManualInput] = useState('');

  // State for inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onManualAdd(manualInput);
      setManualInput('');
    }
  };

  const startEditing = (e: React.MouseEvent, item: WordItem) => {
    e.stopPropagation(); // Prevent selecting the word while trying to edit
    setEditingId(item.id);
    setEditText(item.text);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditText('');
  };

  const saveEditing = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editText.trim()) {
      onEditWord(id, editText);
      setEditingId(null);
      setEditText('');
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (editText.trim()) {
        onEditWord(id, editText);
        setEditingId(null);
        setEditText('');
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200 w-full md:w-80 lg:w-96 shadow-xl z-10">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-200 bg-white z-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-blue-200 shadow-md">
            📖
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800 leading-none">SnapDict</h1>
            <p className="text-xs text-slate-400 mt-1">Scan & Learn</p>
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={onScanClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group mb-4"
        >
          <span className="text-xl group-hover:rotate-12 transition-transform">📸</span>
          <span>Scan Text</span>
        </button>

        {/* Manual Input Area */}
        <form onSubmit={handleManualSubmit} className="relative">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Type a word manually..."
            className="w-full bg-gray-50 border border-gray-200 text-slate-700 text-sm rounded-lg p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button 
            type="submit"
            disabled={!manualInput.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 disabled:opacity-30 p-1 rounded hover:bg-blue-50 transition-colors"
          >
            ➕
          </button>
        </form>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 px-8">
            <span className="text-4xl mb-3 opacity-50">✨</span>
            <p className="text-sm">No words yet.</p>
            <p className="text-xs mt-1">Scan a word or type above!</p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => !editingId && onSelectWord(item)}
              className={`group p-4 rounded-xl border transition-all duration-200 flex justify-between items-center min-h-[84px] ${
                selectedId === item.id
                  ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
              } ${editingId === item.id ? 'cursor-default ring-2 ring-blue-100 border-blue-200' : 'cursor-pointer'}`}
            >
              {editingId === item.id ? (
                // EDIT MODE
                <div className="flex items-center w-full gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-lg text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={(e) => saveEditing(e, item.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Save"
                  >
                    ✅
                  </button>
                  <button 
                    onClick={cancelEditing}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                    title="Cancel"
                  >
                    ❌
                  </button>
                </div>
              ) : (
                // VIEW MODE
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-lg ${selectedId === item.id ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.text}
                      </h3>
                      <button
                        onClick={(e) => startEditing(e, item)}
                        className="opacity-0 group-hover:opacity-100 md:opacity-0 transition-opacity text-xs p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        ✏️
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {selectedId === item.id && (
                    <span className="text-blue-500 text-sm font-medium">View →</span>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};