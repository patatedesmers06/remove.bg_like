'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import ApiKeyManager from '@/components/dashboard/api-key-manager';
import Link from 'next/link';
import { LogOut } from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [showCreditModal, setShowCreditModal] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) {
                window.location.href = '/login';
            } else {
                setUser(user);
                // Fetch Credits
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', user.id)
                    .single();
                
                setCredits(profile?.credits ?? 0);
            }
        });
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
                <Link href="/" className="font-extrabold text-2xl tracking-tight text-slate-900">
                    OpenRemover <span className="text-blue-600 font-medium">Developer</span>
                </Link>
                <div className="flex items-center gap-4">
                     {/* Credit Badge in Nav */}
                     <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-bold text-slate-700">{credits !== null ? credits : '...'} Credits</span>
                     </div>
                    <button 
                        onClick={handleSignOut} 
                        className="text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-transparent hover:border-red-100"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12">
                
                {/* Header Section */}
                <div className="mb-12">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Developer Dashboard</h1>
                    <p className="text-lg text-slate-600 max-w-2xl">
                        Welcome back. Manage your API keys, monitor your usage, and configure your account settings here.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* LEFT COLUMN: Account & Stats (4 cols) */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Account Card */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">My Account</h2>
                                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mt-1">
                                        Free Plan
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Email Address</label>
                                    <p className="text-lg font-medium text-slate-900 break-all">{user.email}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase block mb-1">User ID</label>
                                    <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono text-slate-600 block truncate" title={user.id}>
                                        {user.id}
                                    </code>
                                </div>
                            </div>
                        </div>

                        {/* Usage Stats (Real) */}
                        <div className="bg-slate-900 p-8 rounded-2xl shadow-lg text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20 transform translate-x-10 -translate-y-10 group-hover:opacity-30 transition-opacity" />
                            
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 relative z-10 flex justify-between items-center">
                                Available Credits
                                <span className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300">API</span>
                            </h3>
                            
                            <div className="relative z-10">
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-6xl font-extrabold tracking-tighter">
                                        {credits !== null ? credits : '-'}
                                    </span>
                                    <span className="text-lg font-medium text-slate-400">remaining</span>
                                </div>
                                
                                <button 
                                    onClick={() => setShowCreditModal(true)}
                                    className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    ⚡ Buy More Credits
                                </button>
                                <p className="text-xs text-center mt-3 text-slate-500">
                                    1 Credit = 1 Image Removal
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Credit Shop Modal */}
                    {showCreditModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                <button 
                                    onClick={() => setShowCreditModal(false)}
                                    className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
                                >
                                    ✕
                                </button>

                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Top Up Your Credits</h2>
                                    <p className="text-slate-500 text-lg">Choose a pack that fits your needs. Secure payment via Stripe.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Small Pack */}
                                    <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl hover:border-blue-200 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col items-center text-center">
                                        <div className="mb-4 text-center">
                                            <span className="text-4xl block mb-2">🥤</span>
                                            <h4 className="font-bold text-slate-900 text-lg">Small Pack</h4>
                                            <p className="text-slate-500 text-sm">Starter Boost</p>
                                        </div>
                                        <div className="mb-8">
                                            <p className="text-4xl font-extrabold text-slate-900">50 <span className="text-sm font-medium text-slate-400">credits</span></p>
                                            <p className="text-slate-900 font-bold mt-2">$4.99</p>
                                        </div>
                                        <a href="#" className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-colors">
                                            Buy Small
                                        </a>
                                    </div>

                                    {/* Medium Pack (Highlighted) */}
                                    <div className="bg-white border-2 border-blue-500 p-6 rounded-2xl shadow-xl shadow-blue-500/10 relative overflow-hidden transform md:-translate-y-4 flex flex-col items-center text-center ring-4 ring-blue-500/10">
                                        <div className="absolute top-0 right-0 left-0 bg-blue-500 text-white text-xs font-bold py-1 uppercase tracking-wider">
                                            Most Popular
                                        </div>
                                        <div className="mb-4 mt-4 text-center">
                                            <span className="text-5xl block mb-2">🥤</span>
                                            <h4 className="font-bold text-slate-900 text-xl">Medium Pack</h4>
                                            <p className="text-blue-600 text-sm font-bold">Best Value</p>
                                        </div>
                                        <div className="mb-8">
                                            <p className="text-5xl font-extrabold text-slate-900">150 <span className="text-sm font-medium text-slate-400">credits</span></p>
                                            <p className="text-slate-900 font-bold mt-2">$12.99</p>
                                        </div>
                                        <a href="#" className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors">
                                            Buy Medium
                                        </a>
                                    </div>

                                    {/* Large Pack */}
                                    <div className="bg-white border-2 border-slate-100 p-6 rounded-2xl hover:border-purple-200 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col items-center text-center">
                                        <div className="mb-4 text-center">
                                            <span className="text-6xl block mb-2">🥤</span>
                                            <h4 className="font-bold text-slate-900 text-lg">Large Pack</h4>
                                            <p className="text-slate-500 text-sm">Agency Size</p>
                                        </div>
                                        <div className="mb-8">
                                            <p className="text-4xl font-extrabold text-slate-900">500 <span className="text-sm font-medium text-slate-400">credits</span></p>
                                            <p className="text-slate-900 font-bold mt-2">$34.99</p>
                                        </div>
                                        <a href="#" className="w-full py-3 rounded-xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-colors">
                                            Buy Large
                                        </a>
                                    </div>
                                </div>
                                
                                <p className="text-center text-slate-400 text-sm mt-8">
                                    Transactions are secure and encrypted. Credits are added immediately.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* RIGHT COLUMN: API Keys & Docs (8 cols) */}
                    <div className="lg:col-span-8 space-y-10">
                        
                        <ApiKeyManager userId={user.id} />

                        {/* Documentation Snippet */}
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
                            <h3 className="text-lg font-bold text-blue-900 mb-3">Quick Integration</h3>
                            <p className="text-blue-700 mb-6">
                                Authenticate your requests by including your secret key in the <code>x-api-key</code> header.
                            </p>
                            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-sm">
                                <div className="flex items-center px-4 py-2 bg-slate-800 border-b border-slate-700">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                    <span className="ml-4 text-xs text-slate-400 font-mono">cURL Example</span>
                                </div>
                                <div className="p-6 overflow-x-auto">
                                <pre className="font-mono text-sm text-green-400">
{`curl -X POST https://openremover.vercel.app/api/v1/remove \\
  -H "x-api-key: YOUR_API_KEY" \\
  -F "image=@photo.jpg" \\
  --output result.png`}
                                </pre>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
