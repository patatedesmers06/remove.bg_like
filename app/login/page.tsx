'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                window.location.href = '/dashboard';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
                <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                             <div className="w-6 h-6 bg-white rounded-full opacity-50" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Sign in to manage your keys and usage.</p>
                    </div>
                    
                    <Auth 
                        supabaseClient={supabase} 
                        appearance={{ 
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#0f172a', // slate-900
                                        brandAccent: '#2563eb', // blue-600
                                        inputBorder: '#e2e8f0',
                                        inputText: '#1e293b',
                                        inputPlaceholder: '#cbd5e1',
                                    },
                                    radii: {
                                        borderRadiusButton: '0.75rem',
                                        inputBorderRadius: '0.75rem',
                                    },
                                    space: {
                                        inputPadding: '1rem',
                                        buttonPadding: '1rem',
                                    },
                                    fonts: {
                                        bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                                        buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                                    }
                                }
                            },
                            className: {
                                button: 'shadow-lg shadow-slate-900/10 font-bold text-sm',
                                input: 'font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            }
                        }} 
                        providers={['github', 'google']}
                        theme="light"
                        showLinks={true}
                    />
                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            By continuing, you agree to our <a href="#" className="underline hover:text-slate-600">Terms</a> and <a href="#" className="underline hover:text-slate-600">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting...</p>
        </div>
    );
}
