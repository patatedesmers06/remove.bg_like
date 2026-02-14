'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Copy, Check, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ApiKey {
  id: string;
  usage_count: number;
  created_at: string;
  name: string;
  // key_hash is hidden
}

export default function ApiKeyManager({ userId }: { userId: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');

  useEffect(() => {
    fetchKeys();
  }, [userId]);

  const fetchKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setKeys(data);
    }
    setLoading(false);
  };

  const generateKey = async () => {
    // 1. Generate random key
    const rawKey = 'sk_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 2. Hash it
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 3. Insert into DB
    const { error } = await supabase.from('api_keys').insert({
        user_id: userId,
        key_hash: keyHash,
        name: keyName || 'My API Key',
        usage_count: 0
    });

    if (error) {
        alert('Error creating key: ' + error.message);
        return;
    }

    setNewKey(rawKey);
    setKeyName('');
    fetchKeys();
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (!error) {
        setKeys(keys.filter(k => k.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-slate-100 pb-6">
        <div>
            <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
                <div className="p-2 bg-slate-100 rounded-lg">
                    <Key className="w-6 h-6 text-slate-700" />
                </div>
                API Keys
            </h2>
            <p className="text-slate-500 mt-1 ml-1">Manage access tokens for your applications.</p>
        </div>
      </div>

      {/* Generator Section */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-slate-300">
        <h3 className="font-bold text-lg mb-4 text-slate-800">Create New Key</h3>
        <div className="flex gap-4">
            <input 
                type="text" 
                placeholder="Key Name (e.g. Production App)" 
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                value={keyName}
                onChange={e => setKeyName(e.target.value)}
            />
            <button 
                onClick={generateKey}
                className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={!keyName}
            >
                <Plus className="w-5 h-5" /> Generate
            </button>
        </div>
      </div>

      {newKey && (
         <div className="bg-green-50 border border-green-200 p-6 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-green-100 rounded-full text-green-600 mt-1">
                    <Check className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-green-900 font-bold text-lg mb-1">Key Generated Successfully</h4>
                    <p className="text-green-700 mb-4">Copy this key now. You won't be able to see it again!</p>
                    <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-green-100 font-mono text-base shadow-inner">
                        <span className="flex-1 break-all text-slate-800 font-bold tracking-wide">{newKey}</span>
                        <CopyButton text={newKey} />
                    </div>
                </div>
            </div>
         </div>
      )}

      <div className="space-y-4">
        {loading ? (
            <div className="flex justify-center py-12">
                <Loader2 className="animate-spin w-10 h-10 text-blue-500" />
            </div>
        ) : keys.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <Key className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-lg text-slate-500 font-medium">No API keys active</p>
                <p className="text-sm text-slate-400">Create one above to get started.</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {keys.map((k, i) => (
                    <div key={k.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                                {i + 1}
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-900">{k.name}</p>
                                <p className="text-sm text-slate-500 font-medium">Created on {new Date(k.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="text-right">
                                <p className="text-2xl font-bold text-slate-900">{k.usage_count}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Calls</p>
                            </div>
                            <div className="h-10 w-px bg-slate-200" />
                            <button 
                                onClick={() => deleteKey(k.id)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-3 rounded-xl transition-all"
                                title="Revoke Key"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (
        <button onClick={copy} className="text-slate-500 hover:text-slate-900">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
    )
}
