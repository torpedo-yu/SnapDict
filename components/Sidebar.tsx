import React, { useState, useRef } from 'react';
import { WordItem } from '../types';

interface SidebarProps {
  history: WordItem[];
  selectedId: string | null;
  onSelectWord: (word: WordItem) => void;
  onScanClick: () => void;
  onManualAdd: (text: string) => void;
  onEditWord: (id: string, newText: string) => void;
  onDeleteWord: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  history,
  selectedId,
  onSelectWord,
  onScanClick,
  onManualAdd,
  onEditWord,
  onDeleteWord,
}) => {
  // State for manual add input
  const [manualInput, setManualInput] = useState('');

  // State for item modes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // State for Swipe Actions (Revealed Item ID)
  const [revealedId, setRevealedId] = useState<string | null>(null);
  
  // Touch handling refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onManualAdd(manualInput);
      setManualInput('');
    }
  };

  // --- Interaction Handlers ---

  const handleRowClick = (item: WordItem) => {
    if (editingId === item.id) return;

    // If this item is revealed (buttons shown), tap closes it
    if (revealedId === item.id) {
      setRevealedId(null);
      return;
    }

    // If another item is revealed, close it first
    if (revealedId) {
      setRevealedId(null);
    }

    // Select the word
    onSelectWord(item);
  };

  // --- Swipe / Touch Logic ---

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (!touchStartRef.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartRef.current.x;
    const diffY = endY - touchStartRef.current.y;

    touchStartRef.current = null;

    // Determine if swipe is horizontal and significant enough (>40px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        // Swipe Left -> Reveal
        setRevealedId(id);
      } else {
        // Swipe Right -> Hide
        if (revealedId === id) setRevealedId(null);
      }
    }
  };

  const toggleReveal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRevealedId(prev => prev === id ? null : id);
  };

  // --- Action Handlers ---

  const startEditing = (e: React.MouseEvent, item: WordItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditText(item.text);
    setRevealedId(null); // Close the slide menu
  };

  const performDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this word?")) {
      onDeleteWord(id);
      if (revealedId === id) setRevealedId(null);
    }
  };

  // --- Edit Mode Handlers ---

  const saveEditing = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editText.trim()) {
      onEditWord(id, editText);
      setEditingId(null);
      setEditText('');
    }
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditText('');
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
          history.map((item) => {
            const isRevealed = revealedId === item.id;
            const isEditing = editingId === item.id;
            const isSelected = selectedId === item.id;

            return (
              <div 
                key={item.id} 
                className="relative overflow-hidden rounded-xl bg-gray-100 mb-2 select-none group"
              >
                {/* LAYER 1: ACTIONS (Behind) */}
                <div className="absolute inset-y-0 right-0 w-32 flex items-center justify-end gap-2 pr-4 z-0">
                    {/* Edit Button */}
                    <button
                        onClick={(e) => startEditing(e, item)}
                        className="w-10 h-10 flex items-center justify-center bg-white text-slate-500 rounded-lg shadow-sm hover:text-blue-600 active:scale-95 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </button>
                    {/* Delete Button */}
                    <button
                        onClick={(e) => performDelete(e, item.id)}
                        className="w-10 h-10 flex items-center justify-center bg-white text-red-500 rounded-lg shadow-sm hover:bg-red-50 active:scale-95 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                </div>

                {/* LAYER 2: CONTENT (Front) */}
                <div
                  onClick={() => handleRowClick(item)}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={(e) => handleTouchEnd(e, item.id)}
                  className={`
                    relative z-10 min-h-[84px] p-4 flex items-center justify-between bg-white transition-transform duration-300 ease-out border rounded-xl
                    ${isRevealed ? '-translate-x-32' : 'translate-x-0'}
                    ${isSelected && !isEditing ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-transparent hover:border-gray-200 hover:shadow-sm'}
                    ${isEditing ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  {isEditing ? (
                    // EDIT MODE VIEW
                    <div className="flex items-center w-full gap-2 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                        className="flex-1 bg-white border border-gray-300 rounded px-2 py-2 text-lg text-slate-800 font-bold focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                      <button 
                        onClick={(e) => saveEditing(e, item.id)}
                        className="w-10 h-10 flex items-center justify-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:scale-95 transition-all"
                      >
                        ✅
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="w-10 h-10 flex items-center justify-center bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:scale-95 transition-all"
                      >
                        ❌
                      </button>
                    </div>
                  ) : (
                    // NORMAL VIEW
                    <>
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className={`font-bold text-lg truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {item.text}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {/* Desktop/Action Toggle (Visible on Hover or if revealed) */}
                      <button
                        onClick={(e) => toggleReveal(e, item.id)}
                        className={`p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-all
                            ${isRevealed ? 'opacity-100 text-blue-600 bg-blue-50' : 'md:opacity-0 md:group-hover:opacity-100'}
                        `}
                      >
                        {isRevealed ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};