import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BoundingBox } from '../types';

// Declare global Tesseract variable from CDN
declare const Tesseract: any;

interface ScannerProps {
  onClose: () => void;
  onWordSelected: (word: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onClose, onWordSelected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'results'>('idle');
  const [error, setError] = useState<string>('');
  const [detectedWords, setDetectedWords] = useState<BoundingBox[]>([]);
  const [snapshot, setSnapshot] = useState<string | null>(null);
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
        // Allows "it's", "well-known", but rejects "123", "!!"
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

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar - Increased Z-Index to 60 to stay above everything */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[60] flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="text-white font-medium tracking-wide drop-shadow-md">SnapDict Scanner</div>
        <button 
          onClick={onClose} 
          className="p-3 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto"
        >
           {/* Explicit SVG for clear close icon */}
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        
        {/* Error Message */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-[70] shadow-xl">
            {error}
          </div>
        )}

        {/* 1. Live Video Feed (Visible only in IDLE) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute w-full h-full object-cover ${status !== 'idle' ? 'hidden' : 'block'}`}
        />

        {/* 2. Target Box (Only when idle) */}
        {status === 'idle' && (
          // Positioned at top 1/3 (33% from top) to match 1:2 ratio preference
          <div className="absolute z-10 w-[85%] h-[160px] border-2 border-yellow-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
             {/* Removed text label as requested */}
          </div>
        )}

        {/* 3. Captured Image View (Scanning OR Results) */}
        {/* This persists during 'scanning' to show the freeze-frame effect */}
        {(status === 'scanning' || status === 'results') && snapshot && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="relative max-w-full max-h-full">
              {/* The Captured Image */}
              <img 
                ref={imgRef}
                src={snapshot}
                className="block max-w-full max-h-[70vh] rounded-lg shadow-2xl border border-gray-700 object-contain"
                alt="Scanned text"
                onLoad={() => forceUpdate(n => n + 1)}
              />
              
              {/* Loading Spinner Overlay (Only during Scanning) */}
              {status === 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-lg z-40">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                  <span className="text-white font-medium text-sm tracking-wide shadow-black drop-shadow-lg">Processing...</span>
                </div>
              )}

              {/* Interactive Word Overlays (Only during Results) */}
              {status === 'results' && detectedWords.map((box, idx) => (
                <button
                  key={idx}
                  onClick={() => onWordSelected(box.text)}
                  className="absolute bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400 rounded cursor-pointer transition-all active:scale-95 group"
                  style={getImgBoxStyle(box)}
                >
                  {/* Helper tooltip for very small boxes */}
                  <span className="sr-only">{box.text}</span>
                </button>
              ))}
              
              {status === 'results' && detectedWords.length === 0 && (
                <div className="absolute -bottom-12 left-0 right-0 text-center">
                   <span className="inline-block bg-gray-800 text-gray-300 px-4 py-2 rounded-full text-sm border border-gray-700">
                     No words detected
                   </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls (Visible only when IDLE) */}
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
    </div>
  );
};