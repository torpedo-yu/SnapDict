import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BoundingBox } from '../types';

// Declare global Tesseract variable from CDN
declare const Tesseract: any;

type ScanMode = 'single' | 'multiple' | 'sentence';

interface ScannerProps {
  onClose: () => void;
  onWordSelected: (word: string) => void;
  onBatchAdd: (words: string[]) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onClose, onWordSelected, onBatchAdd }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'results'>('idle');
  const [error, setError] = useState<string>('');
  const [detectedWords, setDetectedWords] = useState<BoundingBox[]>([]);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  
  // Mode State
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Force update for resize/load events
  const [, forceUpdate] = useState(0);

  // Initialize Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setStatus('loading');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => console.error("Play error:", e));
            setStatus('idle');
          };
        }
      } catch (err) {
        console.error(err);
        setError('无法访问摄像头，请检查权限设置。');
        setStatus('idle');
      }
    };

    startCamera();

    const handleResize = () => forceUpdate(n => n + 1);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Helper to calculate video display metrics
  const getVideoMetrics = (video: HTMLVideoElement) => {
    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const clientW = video.clientWidth;
    const clientH = video.clientHeight;

    if (!videoW || !videoH) return { scale: 1, offsetX: 0, offsetY: 0 };

    const scale = Math.max(clientW / videoW, clientH / videoH);
    const renderedW = videoW * scale;
    const renderedH = videoH * scale;
    const offsetX = (clientW - renderedW) / 2;
    const offsetY = (clientH - renderedH) / 2;

    return { scale, offsetX, offsetY };
  };

  // Improve OCR accuracy by preprocessing the image
  const preprocessImage = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      // Grayscale
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];
      let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      
      // Simple contrast boost
      v = v < 128 ? v * 0.8 : v * 1.2; 
      if (v > 255) v = 255;

      d[i] = d[i+1] = d[i+2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    video.pause();
    // Immediately switch to scanning state to hide UI
    setStatus('scanning');
    setError('');
    // Reset mode when new scan starts
    setScanMode('single');
    setSelectedIndices(new Set());

    try {
      const { scale, offsetX, offsetY } = getVideoMetrics(video);

      // ROI Dimensions (match UI)
      const clientW = video.clientWidth;
      const clientH = video.clientHeight;
      const roiW_client = clientW * 0.85; 
      const roiH_client = 160; 
      const roiX_client = (clientW - roiW_client) / 2;
      // Updated Position: Top 1/3 (Center is at 1/3 of height)
      const roiY_client = (clientH / 3) - (roiH_client / 2);

      // Map to Video Coordinates
      const roiX_video = (roiX_client - offsetX) / scale;
      const roiY_video = (roiY_client - offsetY) / scale;
      const roiW_video = roiW_client / scale;
      const roiH_video = roiH_client / scale;

      // Extract Image
      const canvas = document.createElement('canvas');
      canvas.width = roiW_video;
      canvas.height = roiH_video;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.drawImage(
        video, 
        roiX_video, roiY_video, roiW_video, roiH_video,
        0, 0, roiW_video, roiH_video
      );

      // Enhance image for OCR
      preprocessImage(ctx, roiW_video, roiH_video);

      const roiUrl = canvas.toDataURL('image/png');
      setSnapshot(roiUrl);

      // Run OCR
      const { data: { words } } = await Tesseract.recognize(roiUrl, 'eng');

      const boxes: BoundingBox[] = words.map((w: any) => {
        // Clean the text: remove leading/trailing punctuation
        const cleanText = w.text.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
        
        return {
          text: cleanText,
          originalText: w.text,
          x0: w.bbox.x0,
          y0: w.bbox.y0,
          x1: w.bbox.x1,
          y1: w.bbox.y1,
        };
      }).filter((w: any) => {
        // Filter: must have at least 2 chars, and contain letters
        return w.text.length > 1 && /[a-zA-Z]/.test(w.text);
      });

      setDetectedWords(boxes);
      setStatus('results');

    } catch (e) {
      console.error(e);
      setError("识别失败，请重试");
      video.play();
      setStatus('idle');
    }
  }, []);

  // Calculate style for words overlay on the result Image
  const getImgBoxStyle = (box: BoundingBox) => {
    if (!imgRef.current) return { display: 'none' };
    const img = imgRef.current;
    
    // Calculate scale based on displayed size vs natural size of the screenshot
    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;

    return {
      left: `${box.x0 * scaleX}px`,
      top: `${box.y0 * scaleY}px`,
      width: `${(box.x1 - box.x0) * scaleX}px`,
      height: `${(box.y1 - box.y0) * scaleY}px`,
    };
  };

  // --- Logic for Interaction Modes ---

  const handleWordClick = (e: React.MouseEvent, word: string, index: number) => {
    e.stopPropagation();
    
    if (scanMode === 'single') {
      onWordSelected(word);
    } else {
      // Toggle Selection for Multiple/Sentence modes
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      setSelectedIndices(newSet);
    }
  };

  const handleModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    // Selection is persisted when switching modes
  };

  const handleAction = () => {
    // Filter and Sort: Get selected indices, sort them ascending (Reading order)
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
    
    if (sortedIndices.length === 0) return;

    if (scanMode === 'multiple') {
      // Get words in reading order
      const wordsToAdd = sortedIndices.map(idx => detectedWords[idx].text);
      onBatchAdd(wordsToAdd);
    } else if (scanMode === 'sentence') {
      // Join words into a sentence
      const sentence = sortedIndices.map(idx => detectedWords[idx].originalText).join(' ');
      const cleanSentence = sentence.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
      onWordSelected(cleanSentence);
    }
  };

  // --- Helper Logic ---

  const getHintMessage = () => {
    if (scanMode === 'single') return "Tap a word to look it up";
    if (scanMode === 'multiple') return "Select words to add";
    if (scanMode === 'sentence') return "Select words to make a sentence";
    return "";
  };

  // Hint Component (Styled Span)
  const HintBadge = () => (
     <span className="bg-black/60 backdrop-blur-md text-white/90 text-sm px-4 py-1.5 rounded-full shadow-lg border border-white/10 animate-in fade-in slide-in-from-bottom-1 duration-300">
       {getHintMessage()}
     </span>
  );

  // Shared Class for the ROI container anchor (Center at Top 1/3)
  // We use absolute positioning for the Action Buttons relative to this anchor
  // so the anchor itself NEVER moves/resizes, preventing layout shifts.
  const roiAnchorClass = "absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[160px] z-30";

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[60] flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="text-white font-medium tracking-wide drop-shadow-md">SnapDict Scanner</div>
        <button 
          onClick={onClose} 
          className="p-3 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto"
        >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black">
        
        {/* Error Message */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-[70] shadow-xl">
            {error}
          </div>
        )}

        {/* 1. Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${status !== 'idle' ? 'hidden' : 'block'}`}
        />

        {/* 2. ROI Anchor - Idle State */}
        {status === 'idle' && (
          <div className={roiAnchorClass}>
             {/* Hint removed in Idle state */}
             
             {/* The Box */}
             <div className="w-full h-full border-2 border-yellow-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none"></div>
          </div>
        )}

        {/* 3. Result View - Anchored exactly at ROI Position */}
        {(status === 'scanning' || status === 'results') && snapshot && (
          <div className="absolute inset-0 z-30 bg-black">
            
            {/* The Anchor Div - Positioned IDENTICALLY to Idle Box */}
            <div className={roiAnchorClass}>
              
              {/* Hint 1: Above ROI */}
              {status === 'results' && (
                <div className="absolute bottom-full left-0 right-0 mb-4 flex justify-center pointer-events-none z-50">
                  <HintBadge />
                </div>
              )}

              {/* Image Container (Fills Anchor) */}
              <div className="relative w-full h-full rounded-lg shadow-2xl bg-gray-900">
                <img 
                  ref={imgRef}
                  src={snapshot}
                  className="w-full h-full object-fill rounded-lg border border-yellow-400/50"
                  alt="Scanned text"
                  onLoad={() => forceUpdate(n => n + 1)}
                />
                
                {/* Loading Spinner */}
                {status === 'scanning' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-lg z-40">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                    <span className="text-white font-medium text-sm tracking-wide shadow-black drop-shadow-lg">Processing...</span>
                  </div>
                )}

                {/* Interactive Words */}
                {status === 'results' && detectedWords.map((box, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  const isInteractiveMode = scanMode !== 'single';
                  
                  return (
                    <button
                      key={idx}
                      onClick={(e) => handleWordClick(e, box.text, idx)}
                      className={`absolute rounded cursor-pointer transition-all active:scale-95 group ${
                        isInteractiveMode 
                          ? (isSelected 
                              ? 'bg-blue-500/50 border-2 border-blue-400 z-10' 
                              : 'bg-transparent border border-blue-400 hover:bg-blue-500/10') 
                          : 'bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400'
                      }`}
                      style={getImgBoxStyle(box)}
                    >
                      <span className="sr-only">{box.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Button - ABSOLUTELY positioned BELOW the anchor */}
              {/* This removes it from document flow so it doesn't push the image up */}
              {status === 'results' && scanMode !== 'single' && (
                <div className="absolute top-full left-0 right-0 mt-6 flex justify-center animate-in fade-in slide-in-from-top-2 duration-300 z-50">
                  <button
                    onClick={handleAction}
                    disabled={selectedIndices.size === 0}
                    className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                      selectedIndices.size > 0 
                        ? 'bg-blue-600 active:scale-95 hover:bg-blue-500 shadow-blue-900/20' 
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {scanMode === 'multiple' ? 'Add words to list' : 'Look up this sentence'}
                    {selectedIndices.size > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{selectedIndices.size}</span>}
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls - IDLE (Capture Button) */}
      {status === 'idle' && (
        <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 bg-black/60 backdrop-blur-xl flex justify-center items-center z-20 min-h-[140px]">
          <button 
            onClick={captureAndScan}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600"></div>
          </button>
        </div>
      )}

      {/* Bottom Controls - RESULTS (Mode Selector) */}
      {status === 'results' && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl z-40 flex flex-col items-center pb-8 pt-6 rounded-t-2xl border-t border-gray-800 transition-all">
          
          {/* Hint 2: Above Buttons */}
          <div className="mb-4 flex justify-center pointer-events-none">
             <HintBadge />
          </div>

          {/* Mode Toggles */}
          <div className="flex bg-gray-800 p-1 rounded-xl w-[90%] max-w-md">
            {(['single', 'multiple', 'sentence'] as ScanMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                  scanMode === mode 
                    ? 'bg-gray-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};
