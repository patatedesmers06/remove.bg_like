'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Loader2, Upload, Download, ImageIcon, ChevronDown, RotateCcw, Pipette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  const [modelErrors, setModelErrors] = useState<string[]>([]);
  
  // New State for Background Color
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  
  // New State for Manual Color Removal (Chroma Key)
  const [removeColor, setRemoveColor] = useState<string>('#000000');
  const [useRemoveColor, setUseRemoveColor] = useState<boolean>(false);
  const [removeTolerance, setRemoveTolerance] = useState<number>(10);
  const [isPickingColor, setIsPickingColor] = useState<boolean>(false); // New state for picker
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg' | 'webp'>('png');

  const FORMAT_OPTIONS = [
    { label: 'PNG', value: 'png' as const, mime: 'image/png', ext: 'png' },
    { label: 'JPEG', value: 'jpeg' as const, mime: 'image/jpeg', ext: 'jpg' },
    { label: 'WebP', value: 'webp' as const, mime: 'image/webp', ext: 'webp' },
  ];

  const BACKGROUND_OPTIONS = [
    { name: 'Transparent', value: 'transparent', class: 'checkerboard-bg' },
    { name: 'White', value: '#ffffff', class: 'bg-white' },
    { name: 'Black', value: '#000000', class: 'bg-black' },
    { name: 'Green', value: '#00ff00', class: 'bg-green-500' },
    { name: 'Blue', value: '#0000ff', class: 'bg-blue-600' },
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Shared file handler for upload, drop, and paste
  const handleNewFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    // Revoke old URLs to prevent memory leaks
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFile(f);
    setOriginalUrl(URL.createObjectURL(f));
    setProcessedUrl(null);
    setError(null);
    setBgColor('transparent');
  }, [originalUrl, processedUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleNewFile(e.target.files[0]);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleNewFile(f);
  };

  // Ctrl+V paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) handleNewFile(f);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleNewFile]);

  // Reset handler
  const handleReset = () => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setFile(null);
    setOriginalUrl(null);
    setProcessedUrl(null);
    setError(null);
    setBgColor('transparent');
    setDownloadFormat('png');
    // Reset Manual Color Removal (Chroma Key) modifiers
    setUseRemoveColor(false);
    setRemoveColor('#000000');
    setRemoveTolerance(10);
    setIsPickingColor(false);
    
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // Handle click on original image to pick color
  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPickingColor || !originalUrl) return;

    // We clicked the overlay DIV. We need to find the underlying image to get dimensions.
    // Since the overlay covers the image container, we can find the sibling img.
    const container = e.currentTarget.parentElement?.parentElement;
    const img = container?.querySelector('img[alt="Preview"]') as HTMLImageElement;
    
    if (!img) return;

    const rect = img.getBoundingClientRect();
    
    // Calculate click position relative to the image
    // The click is on the overlay which matches the container size.
    // The image might be smaller due to object-contain.
    // But here the overlay is inside the same relative container as the image?
    // Let's assume the click event client coordinates are what matters.
    
    // We need to check if the click is actually within the image bounds displayed
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        return; // Clicked outside the actual image area (in the padding)
    }

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate natural coordinates
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const naturalX = Math.floor(x * scaleX);
    const naturalY = Math.floor(y * scaleY);

    try {
        // Draw to hidden canvas to extract pixel
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageObj = new Image();
        imageObj.crossOrigin = "anonymous";
        imageObj.src = originalUrl;
        await new Promise((resolve) => { imageObj.onload = resolve; });
        
        ctx.drawImage(imageObj, 0, 0);
        const pixel = ctx.getImageData(naturalX, naturalY, 1, 1).data;
        
        // Convert RGB to Hex
        const hex = "#" + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
        setRemoveColor(hex);
        setIsPickingColor(false); // Turn off picker after selection

    } catch (err) {
        console.error("Failed to pick color", err);
    }
  };

  const processImage = async () => {
    if (!file) return;
    if (!session) {
        window.location.href = '/login';
        return;
    }

    setLoading(true);
    setError(null);
    setProcessedUrl(null); // Clear previous result immediately
    setModelInfo(null);
    setModelErrors([]);

    try {
        const formData = new FormData();
        if (file) formData.append('image', file);
        
        // Always request transparent background from the API so we can composite it locally on the client
        formData.append('bg_color', 'transparent');
        // Force PNG format from the API to preserve the alpha channel for client-side background changes
        formData.append('format', 'png');
        
        // Send manual removal params if enabled
        if (useRemoveColor) {
            formData.append('remove_color', removeColor);
            formData.append('remove_tolerance', removeTolerance.toString());
        }
        const res = await fetch('/api/v1/remove', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to process image');
        }

        const blob = await res.blob();
        if (blob.size === 0) throw new Error("Empty response from server");
        
        const url = URL.createObjectURL(blob);
        setProcessedUrl(url);
        
        // Capture model info if present
        const modelUsed = res.headers.get('X-Model-Used');
        if (modelUsed) setModelInfo(modelUsed);

        const errorsHeader = res.headers.get('X-Model-Errors');
        if (errorsHeader) {
            try {
                setModelErrors(JSON.parse(errorsHeader));
            } catch (e) {
                console.error('Failed to parse model errors', e);
            }
        }

    } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
        setLoading(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!processedUrl) return;

    const fmt = FORMAT_OPTIONS.find(f => f.value === downloadFormat) || FORMAT_OPTIONS[0];
    const needsCanvas = bgColor !== 'transparent' || downloadFormat !== 'png';

    if (!needsCanvas) {
        // Direct download for transparent PNG (original processed output)
        const a = document.createElement('a');
        a.href = processedUrl;
        a.download = `openremover-result-${Date.now()}.${fmt.ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    // Use canvas to convert format and/or composite background
    try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = processedUrl;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No canvas context");

        // Fill background: use selected color, or white for JPEG (no transparency)
        if (bgColor !== 'transparent' || downloadFormat === 'jpeg') {
            ctx.fillStyle = bgColor !== 'transparent' ? bgColor : '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw processed image on top
        ctx.drawImage(img, 0, 0);

        // Export as selected format
        const quality = downloadFormat === 'png' ? undefined : 0.92;
        canvas.toBlob((blob) => {
            if (!blob) {
                setError('Failed to generate download. Please try again.');
                return;
            }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `openremover-result-${Date.now()}.${fmt.ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, fmt.mime, quality);

    } catch (err) {
        console.error("Download failed:", err);
        setError('Failed to generate download. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/> v1.0 Released
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
                Remove Backgrounds <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-violet-600">
                    In Seconds.
                </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Powered by state-of-the-art AI. No signup required for demos. 
                <br />Free for developers, open for everyone.
            </p>
        </div>

        {/* Tool Container */}
        <div 
            className={cn(
                "bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border-2 overflow-hidden flex flex-col md:flex-row min-h-[600px] transition-all duration-200 relative",
                isDragging ? "border-blue-400 ring-4 ring-blue-100" : "border-slate-200"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-50/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 pointer-events-none">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center animate-bounce">
                        <Upload className="w-10 h-10 text-blue-600" />
                    </div>
                    <p className="text-xl font-bold text-blue-600">Drop your image here!</p>
                </div>
            )}
            
            {/* Sidebar / Controls */}
            <div className="w-full md:w-[400px] p-8 md:p-10 border-r border-slate-100 flex flex-col gap-8 bg-slate-50/80 backdrop-blur-sm z-20">
                
                <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Image</label>
                    <div className={cn(
                        "border-2 border-dashed rounded-2xl p-8 hover:bg-white hover:border-blue-400 hover:scale-[1.02] transition-all text-center cursor-pointer relative group bg-white/50",
                        isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300"
                    )}>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            id="upload" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center gap-4 text-slate-400 group-hover:text-blue-600 transition-colors">
                            <div className="p-4 bg-slate-100 rounded-full group-hover:bg-blue-50 transition-colors">
                                <Upload className="w-8 h-8" />
                            </div>
                            <span className="font-semibold">Click, Drop, or Paste (Ctrl+V)</span>
                            <span className="text-xs text-slate-400">PNG, JPG, WebP — Max 10 MB</span>
                        </div>
                    </div>
                </div>

                {file && (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]" title={file.name}>{file.name}</p>
                            <span className="text-xs font-mono text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>



                        {/* --- Magic Color Remover --- */}
                        <div className="space-y-3 pt-4 border-t border-slate-200/60 mb-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <div className="p-1 bg-purple-100 rounded text-purple-600">✨</div>
                                    Magic Color Remover
                                </label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={useRemoveColor}
                                        onChange={(e) => setUseRemoveColor(e.target.checked)}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>
                            
                            {useRemoveColor && (
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="relative group/picker">
                                            <input
                                                type="color"
                                                value={removeColor}
                                                onChange={(e) => setRemoveColor(e.target.value)}
                                                className="w-10 h-10 p-0 rounded-lg cursor-pointer border-2 border-white shadow-sm"
                                            />
                                        </div>
                                        
                                        {/* Eyedropper Button */}
                                        <button
                                            onClick={() => setIsPickingColor(!isPickingColor)}
                                            className={cn(
                                                "p-2 rounded-lg border-2 transition-all",
                                                isPickingColor 
                                                    ? "bg-purple-600 border-purple-600 text-white shadow-md scale-105" 
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600"
                                            )}
                                            title="Pick color from image"
                                        >
                                            <Pipette className="w-5 h-5" />
                                        </button>

                                        <div className="text-xs text-slate-500 flex-1 ml-1 leading-tight">
                                            {isPickingColor ? (
                                                <span className="text-purple-700 font-bold animate-pulse">Click on the image to pick a color...</span>
                                            ) : (
                                                "Pick a color to remove (e.g. green screen)."
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Tolerance</span>
                                            <span>{removeTolerance}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="50"
                                            step="1"
                                            value={removeTolerance}
                                            onChange={(e) => setRemoveTolerance(parseInt(e.target.value))}
                                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={processImage}
                            disabled={loading}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3",
                                loading ? "bg-slate-800 cursor-not-allowed opacity-80" : "bg-slate-900 hover:bg-blue-600 active:scale-95"
                            )}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" /> Processing...
                                </>
                            ) : "Remove Background"}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="p-4 text-sm font-medium text-red-600 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                        <div className="mt-0.5"><div className="w-2 h-2 bg-red-500 rounded-full" /></div>
                        <div>
                            {error}
                            {!session && (
                                <p className="mt-2 text-xs text-red-500 underline cursor-pointer hover:text-red-800" onClick={() => window.location.href='/login'}>
                                    Login required for high-res / unlimited use.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Output Controls */}
                {processedUrl && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-auto space-y-6">
                        {/* Background Color Controls */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Background Style</p>
                            <div className="flex flex-wrap gap-3">
                                {BACKGROUND_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setBgColor(opt.value)}
                                        className={cn(
                                            "w-10 h-10 rounded-full border-2 border-slate-200 shadow-sm transition-all hover:scale-110 focus:outline-none",
                                            opt.class,
                                            bgColor === opt.value && "ring-2 ring-offset-2 ring-blue-600 scale-110 border-transparent shadow-md"
                                        )}
                                        title={opt.name}
                                    />
                                ))}
                                {/* Native Color Picker */}
                                <div className={cn(
                                    "relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-200 shadow-sm cursor-pointer hover:scale-110 transition-all",
                                    bgColor !== 'transparent' && !BACKGROUND_OPTIONS.find(o => o.value === bgColor) && "ring-2 ring-offset-2 ring-blue-600 border-white"
                                )}>
                                    <div className="absolute inset-0 bg-linear-to-tr from-blue-500 via-purple-500 to-orange-500" />
                                    <input 
                                        type="color" 
                                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 opacity-0 cursor-pointer"
                                        onChange={(e) => { setBgColor(e.target.value); setCustomColor(e.target.value); }}
                                        value={customColor}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Export & Download */}
                        <div className="space-y-3 pt-4 border-t border-slate-200/60">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Export Image</p>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <select
                                        value={downloadFormat}
                                        onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                                        className="w-full appearance-none bg-white text-slate-900 pl-4 pr-10 py-3 rounded-xl font-bold shadow-sm border border-slate-200 cursor-pointer hover:border-blue-300 transition-all text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="png">PNG</option>
                                        <option value="jpeg">JPEG</option>
                                        <option value="webp">WebP</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                                <button 
                                    onClick={handleDownload}
                                    className="flex-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                >
                                    Download <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Reset button */}
                        <div className="pt-2">
                            <button
                                onClick={handleReset}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-slate-500 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                            >
                                <RotateCcw className="w-4 h-4" /> Start Over
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 relative flex items-center justify-center p-8 md:p-12 bg-slate-100/50">
                 {/* Checkerboard background pattern (Base Layer) */}
                 <div className="absolute inset-0 opacity-5" 
                      style={{ backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)`, backgroundSize: '24px 24px' }} 
                 />
                 
                 {originalUrl ? (
                    processedUrl ? (
                        <div className="flex flex-col gap-6 w-full h-full justify-center z-10 animate-in fade-in zoom-in-95 duration-500">
                            {/* Comparison Slider */}
                            <div className="relative shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 bg-white">
                                <ReactCompareSlider
                                    itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original" />}
                                    itemTwo={
                                        <ReactCompareSliderImage 
                                            src={processedUrl} 
                                            alt="Processed" 
                                            style={
                                                bgColor === 'transparent' 
                                                ? {
                                                    // CSS Checkerboard
                                                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                                    backgroundSize: '20px 20px',
                                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                                    backgroundColor: 'white'
                                                }
                                                : {
                                                    // Solid Color
                                                    backgroundColor: bgColor
                                                }
                                            }
                                        />
                                    }
                                />
                            </div>
                            
                            {/* Debug Info */}
                            <div className="mt-2 space-y-1">
                                {modelInfo && (
                                    <div className="text-center text-xs text-slate-400 font-mono">
                                        Model: {modelInfo}
                                    </div>
                                )}
                                {modelErrors.length > 0 && (
                                    <div className="text-center text-xs text-red-400 font-mono bg-red-50 p-1 rounded">
                                        Load Errors: {modelErrors.join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <div className="relative shadow-2xl rounded-2xl bg-white/50 backdrop-blur-xl z-20 p-2 ring-1 ring-white/50 inline-block max-w-full max-h-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={originalUrl} alt="Preview" className="max-w-full max-h-[600px] object-contain rounded-xl" />
                            </div>

                             {/* Eyedropper Overlay */}
                             {isPickingColor && (
                                <div className="absolute inset-0 z-50 cursor-crosshair group-pick flex items-center justify-center">
                                    <div className="absolute top-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none backdrop-blur-sm z-50">
                                        Click on image to pick color
                                    </div>
                                    {/* Overlay capturing clicks mapped to original image */}
                                    <div 
                                        className="absolute inset-0 z-40"
                                        onClick={handleImageClick}
                                    />
                                </div>
                            )}
                        </div>
                    )
                 ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 z-10 select-none pointer-events-none">
                        <ImageIcon className="w-24 h-24 mb-4 opacity-20" />
                        <p className="text-xl font-medium opacity-40">Ready to transform</p>
                    </div>
                 )}
            </div>
        </div>
      </main>
    </div>
  );
}
