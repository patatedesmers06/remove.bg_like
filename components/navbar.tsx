'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { User, LogIn, Coins, Home, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Do not show the navigation bar on the login page as it ruins its flow
  // Wait, the user asked for "the home button I want it to be always visible in all pages"
  // Even on login page? The login page currently has a back to home button.
  // Actually, we can show the navbar on the login page as well, it'll make it consistent.
  
  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <div className="w-4 h-4 bg-white rounded-full opacity-50" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-slate-900 hidden sm:inline-block">OpenRemover</span>
      </Link>
      
      <div className="flex items-center gap-3">
        <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2">
            <Home className="w-4 h-4" /> <span className="hidden sm:inline-block">Home</span>
        </Link>
        <Link href="/docs" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
            API Docs
        </Link>

        {session ? (
          <>
            {credits !== null && (
              <div className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg" title="Remaining credits">
                <Coins className="w-4 h-4 text-amber-500" />
                <span className={cn(credits <= 2 ? 'text-red-500' : 'text-slate-700')}>{credits}</span>
              </div>
            )}
            
            <Link href="/profile" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 rounded-lg shadow-sm">
                <User className="w-4 h-4" /> <span className="hidden sm:inline-block">Profile</span>
            </Link>

            <button
                onClick={handleSignOut}
                className="text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-transparent hover:border-red-100"
            >
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline-block">Sign Out</span>
            </button>
          </>
        ) : (
          <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2.5 rounded-lg shadow-sm transition-colors">
              <LogIn className="w-4 h-4" /> <span className="hidden sm:inline-block">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
