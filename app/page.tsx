'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Loader2, Upload, Download, ImageIcon, LayoutDashboard, LogIn, ChevronDown, RotateCcw, Coins } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<string | null>(null);
  
  // New State for Background Color
  const [bgColor, setBgColor] = useState<string>('transparent');
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

  // Fetch credits when user is logged in
  const fetchCredits = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    if (data) setCredits(data.credits);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) fetchCredits(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) fetchCredits(session.user.id);
      else setCredits(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

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

    try {
        const formData = new FormData();
        formData.append('image', file);

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

        // Refresh credits after successful processing
        if (session?.user?.id) fetchCredits(session.user.id);

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
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <div className="w-5 h-5 bg-white rounded-full opacity-50" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">OpenRemover</span>
        </Link>
        <div className="flex items-center gap-4">
            <Link href="/docs" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
                API Docs
            </Link>
            {session ? (
                <>
                    {credits !== null && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg" title="Remaining credits">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <span className={cn(credits <= 2 ? 'text-red-500' : 'text-slate-700')}>{credits}</span>
                        </div>
                    )}
                    <Link href="/dashboard" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-lg">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                </>
            ) : (
                <Link href="/login" className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                    <LogIn className="w-4 h-4" /> Login
                </Link>
            )}
        </div>
      </nav>

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
                        "border-2 border-dashed rounded-2xl p-8 hover:bg-white hover:border-blue-400 transition-all text-center cursor-pointer relative group bg-white/50",
                        isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300"
                    )}>
                        <input 
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

                {/* Background Color Controls */}
                {processedUrl && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-auto">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Background Style</p>
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
                                    onChange={(e) => setBgColor(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Reset button */}
                {processedUrl && (
                    <button
                        onClick={handleReset}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-slate-500 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" /> New Image
                    </button>
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
                                <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
                                    {/* Format selector */}
                                    <div className="relative">
                                        <select
                                            value={downloadFormat}
                                            onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                                            className="appearance-none bg-white/90 backdrop-blur-sm text-slate-900 pl-3 pr-8 py-3 rounded-full font-bold shadow-xl border border-slate-200 cursor-pointer hover:bg-white transition-all text-sm"
                                        >
                                            <option value="png">PNG</option>
                                            <option value="jpeg">JPEG</option>
                                            <option value="webp">WebP</option>
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    {/* Download button */}
                                    <button 
                                        onClick={handleDownload}
                                        className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-blue-600 transition-all hover:scale-105 flex items-center gap-2 group"
                                    >
                                        Download <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Debug Info */}
                            {modelInfo && (
                                <div className="text-center text-xs text-slate-400 font-mono mt-2">
                                    Model: {modelInfo}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative shadow-2xl rounded-2xl bg-white/50 backdrop-blur-xl z-10 p-2 ring-1 ring-white/50">
                             <img src={originalUrl} alt="Preview" className="max-w-full max-h-[600px] object-contain rounded-xl" />
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
