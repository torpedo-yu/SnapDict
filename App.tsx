import React, { useState, useEffect } from 'react';
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

  // Derived State
  const selectedWord = history.find(w => w.id === selectedWordId) || null;

  // Init
  useEffect(() => {
    setHistory(storage.getHistory());
  }, []);

  // Handlers
  const handleWordDetected = (text: string) => {
    const updatedHistory = storage.saveWord(text);
    setHistory(updatedHistory);
    setIsScanning(false);
    // Auto select the new word
    if (updatedHistory.length > 0) {
      setSelectedWordId(updatedHistory[0].id);
    }
  };

  const handleManualAdd = (text: string) => {
    const updatedHistory = storage.saveWord(text);
    setHistory(updatedHistory);
    if (updatedHistory.length > 0) {
      setSelectedWordId(updatedHistory[0].id);
    }
  };

  const handleEditWord = (id: string, newText: string) => {
    const updatedHistory = storage.updateWord(id, newText);
    setHistory(updatedHistory);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Left Sidebar (Always visible on desktop, full width on mobile if no selection) */}
      <div className={`${selectedWordId ? 'hidden md:block' : 'block'} w-full md:w-auto h-full`}>
        <Sidebar
          history={history}
          selectedId={selectedWordId}
          onSelectWord={(w) => setSelectedWordId(w.id)}
          onScanClick={() => setIsScanning(true)}
          onManualAdd={handleManualAdd}
          onEditWord={handleEditWord}
        />
      </div>

      {/* Right Content (Visible on desktop, overlays/swaps on mobile) */}
      <main className={`flex-1 h-full ${!selectedWordId ? 'hidden md:flex' : 'block fixed inset-0 z-20 md:static'}`}>
        <DetailView
          wordItem={selectedWord}
          onCloseMobile={() => setSelectedWordId(null)}
        />
      </main>

      {/* Scanner Overlay */}
      {isScanning && (
        <Scanner
          onClose={() => setIsScanning(false)}
          onWordSelected={handleWordDetected}
        />
      )}
    </div>
  );
};

export default App;