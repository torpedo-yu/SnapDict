import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { DetailView } from './components/DetailView';
import { Scanner } from './components/Scanner';
import { WordItem } from './types';
import * as storage from './services/storage';

const App: React.FC = () => {
  // State
  const [history, setHistory] = useState<WordItem[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Refs to track state inside popstate listener
  const isScanningRef = useRef(isScanning);
  const selectedIdRef = useRef(selectedWordId);

  // Derived State
  const selectedWord = history.find(w => w.id === selectedWordId) || null;

  // Sync Refs
  useEffect(() => {
    isScanningRef.current = isScanning;
    selectedIdRef.current = selectedWordId;
  }, [isScanning, selectedWordId]);

  // Init Load
  useEffect(() => {
    setHistory(storage.getHistory());
  }, []);

  // History / Back Button Handler
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Priority 1: Close Scanner if open
      if (isScanningRef.current) {
        setIsScanning(false);
        return;
      }
      // Priority 2: Deselect Word (Close Detail View) if selected
      if (selectedIdRef.current) {
        setSelectedWordId(null);
        return;
      }
      // Otherwise allow default browser back (exit app or prev page)
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Actions that manipulate History ---

  const openScanner = () => {
    // Push new state so back button can close it
    window.history.pushState({ view: 'scanner' }, '', '');
    setIsScanning(true);
  };

  const closeScanner = () => {
    // Trigger back, which fires popstate, which calls setIsScanning(false)
    window.history.back();
  };

  const selectWord = (word: WordItem) => {
    // If already viewing a word, replace state (don't stack detail views)
    // If coming from list, push state
    if (selectedWordId) {
      window.history.replaceState({ view: 'detail' }, '', '');
    } else {
      window.history.pushState({ view: 'detail' }, '', '');
    }
    setSelectedWordId(word.id);
  };

  const closeDetail = () => {
    window.history.back();
  };

  const handleWordDetected = (text: string) => {
    const updatedHistory = storage.saveWord(text);
    setHistory(updatedHistory);
    
    // Important: We are currently in 'Scanner' history state.
    // We want to switch to 'Detail' state without keeping Scanner in history stack.
    // So we REPLACE the current state.
    window.history.replaceState({ view: 'detail' }, '', '');
    
    setIsScanning(false);
    if (updatedHistory.length > 0) {
      setSelectedWordId(updatedHistory[0].id);
    }
  };

  const handleBatchAdd = (texts: string[]) => {
    // Input texts are in reading order (Top->Bottom).
    // storage.saveWord adds new items to the TOP of the list.
    // To make them appear in reading order in the list:
    // We need to add the LAST word first, and the FIRST word last.
    // Example: Reading "A B C". 
    // Save C -> List: [C]
    // Save B -> List: [B, C]
    // Save A -> List: [A, B, C] (Desired)
    let updatedHistory = history;
    
    // Create a reversed copy to iterate
    [...texts].reverse().forEach(text => {
       updatedHistory = storage.saveWord(text);
    });
    
    setHistory(updatedHistory);
    
    // Close scanner and return to list view (simulate back button to pop scanner state)
    window.history.back();
  };

  const handleManualAdd = (text: string) => {
    const updatedHistory = storage.saveWord(text);
    setHistory(updatedHistory);
    if (updatedHistory.length > 0) {
      // Similar logic: if we are already deep in nav, replace, else push
      if (selectedWordId) {
        window.history.replaceState({ view: 'detail' }, '', '');
      } else {
        window.history.pushState({ view: 'detail' }, '', '');
      }
      setSelectedWordId(updatedHistory[0].id);
    }
  };

  const handleEditWord = (id: string, newText: string) => {
    const updatedHistory = storage.updateWord(id, newText);
    setHistory(updatedHistory);
  };

  const handleDeleteWord = (id: string) => {
    const updatedHistory = storage.deleteWord(id);
    setHistory(updatedHistory);
    if (selectedWordId === id) {
      setSelectedWordId(null);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Left Sidebar (Always visible on desktop, full width on mobile if no selection) */}
      <div className={`${selectedWordId ? 'hidden md:block' : 'block'} w-full md:w-auto h-full`}>
        <Sidebar
          history={history}
          selectedId={selectedWordId}
          onSelectWord={selectWord}
          onScanClick={openScanner}
          onManualAdd={handleManualAdd}
          onEditWord={handleEditWord}
          onDeleteWord={handleDeleteWord}
        />
      </div>

      {/* Right Content (Visible on desktop, overlays/swaps on mobile) */}
      <main className={`flex-1 h-full ${!selectedWordId ? 'hidden md:flex' : 'block fixed inset-0 z-20 md:static'}`}>
        <DetailView
          wordItem={selectedWord}
          onCloseMobile={closeDetail}
        />
      </main>

      {/* Scanner Overlay */}
      {isScanning && (
        <Scanner
          onClose={closeScanner}
          onWordSelected={handleWordDetected}
          onBatchAdd={handleBatchAdd}
        />
      )}
    </div>
  );
};

export default App;