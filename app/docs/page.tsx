'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Key, Send, AlertTriangle, Code2, Coins, Gauge, Copy, Check, ChevronRight, ArrowLeft, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Reusable copy button
function CopyBlock({ code, language = 'bash' }: { code: string; language?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="relative group">
            <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        <span className="text-xs text-slate-500 font-mono ml-2">{language}</span>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-700"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <pre className="p-5 overflow-x-auto text-sm leading-relaxed">
                    <code className="text-green-400 font-mono">{code}</code>
                </pre>
            </div>
        </div>
    );
}

// Section wrapper
function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
            </div>
            {children}
        </section>
    );
}

// Info card
function InfoCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={cn("text-lg font-bold text-slate-900", mono && "font-mono text-base")}>{value}</p>
        </div>
    );
}

const NAV_ITEMS = [
    { id: 'auth', label: 'Authentification', icon: Key },
    { id: 'endpoint', label: 'Endpoint', icon: Send },
    { id: 'errors', label: 'Erreurs', icon: AlertTriangle },
    { id: 'examples', label: 'Exemples', icon: Code2 },
    { id: 'n8n', label: 'n8n Setup', icon: Zap },
    { id: 'credits', label: 'Crédits', icon: Coins },
    { id: 'limits', label: 'Limites', icon: Gauge },
];

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState('auth');

    useEffect(() => {
        const sectionIds = NAV_ITEMS.map((item) => item.id);
        const observers: IntersectionObserver[] = [];

        sectionIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            setActiveSection(id);
                        }
                    });
                },
                {
                    rootMargin: '-80px 0px -60% 0px',
                    threshold: 0,
                }
            );

            observer.observe(el);
            observers.push(observer);
        });

        return () => {
            observers.forEach((o) => o.disconnect());
        };
    }, []);

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
                <div className="flex items-center gap-3">
                    <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to App
                    </Link>
                    <Link href="/dashboard" className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
                        Dashboard
                    </Link>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 flex gap-10">
                {/* Sidebar Navigation */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-24">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Navigation</p>
                        <nav className="space-y-1">
                            {NAV_ITEMS.map((item) => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    onClick={() => setActiveSection(item.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                                        activeSection === item.id
                                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </a>
                            ))}
                        </nav>

                        <div className="mt-8 p-4 bg-slate-900 rounded-2xl text-white">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Base URL</p>
                            <code className="text-sm text-green-400 font-mono break-all">https://openremover.vercel.app</code>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 space-y-16">
                    {/* Hero */}
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                            <BookOpen className="w-3.5 h-3.5" /> API v1 Documentation
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                            API Reference
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
                            Intégrez la suppression d&apos;arrière-plan IA dans vos applications, workflows n8n, et automatisations en quelques minutes.
                        </p>
                    </div>

                    {/* Quick Start Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoCard label="Méthode" value="POST" />
                        <InfoCard label="Endpoint" value="/api/v1/remove" mono />
                        <InfoCard label="Réponse" value="Image PNG (binaire)" />
                    </div>

                    {/* ===================== AUTHENTICATION ===================== */}
                    <Section id="auth" icon={Key} title="Authentification">
                        <p className="text-slate-600 mb-6 text-lg">
                            L&apos;API supporte 2 méthodes d&apos;authentification. <strong>La clé API est recommandée</strong> pour les intégrations externes (n8n, scripts, etc.).
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Method 1 */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-blue-200 shadow-sm relative">
                                <div className="absolute -top-3 left-4">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">Recommandé</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mt-2 mb-3">🔑 Clé API</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Ajoutez votre clé dans le header <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">x-api-key</code>.
                                </p>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm">
                                    <span className="text-slate-500">Header:</span>{' '}
                                    <span className="text-blue-600">x-api-key</span>: <span className="text-green-600">sk_xxx...</span>
                                </div>
                            </div>

                            {/* Method 2 */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-3">🎫 Bearer Token</h3>
                                <p className="text-slate-600 text-sm mb-4">
                                    Utilisez un token Supabase Auth dans le header <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800">Authorization</code>.
                                </p>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm">
                                    <span className="text-slate-500">Header:</span>{' '}
                                    <span className="text-blue-600">Authorization</span>: <span className="text-green-600">Bearer eyJ...</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold text-amber-900 text-sm">Comment obtenir une clé API ?</p>
                                <p className="text-amber-700 text-sm mt-1">
                                    Connectez-vous → <Link href="/dashboard" className="underline font-bold hover:text-amber-900">Dashboard</Link> → Créez une clé dans &quot;API Keys&quot; → <strong>Copiez-la immédiatement</strong> (elle ne sera plus visible).
                                </p>
                            </div>
                        </div>
                    </Section>

                    {/* ===================== ENDPOINT ===================== */}
                    <Section id="endpoint" icon={Send} title="Endpoint : Remove Background">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-900 px-6 py-4 flex items-center gap-3">
                                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">POST</span>
                                <code className="text-green-400 font-mono text-sm">/api/v1/remove</code>
                            </div>

                            <div className="p-6 space-y-8">
                                {/* Request Params */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Paramètres (multipart/form-data)</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Champ</th>
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Type</th>
                                                    <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Requis</th>
                                                    <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-slate-100">
                                                    <td className="py-3 px-4 font-mono font-bold text-blue-700">image</td>
                                                    <td className="py-3 px-4 text-slate-600">File</td>
                                                    <td className="py-3 px-4 text-center"><span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">Oui</span></td>
                                                    <td className="py-3 px-4 text-slate-600">Image à traiter (PNG, JPG, WebP — max 10 Mo)</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-mono font-bold text-blue-700">bg_color</td>
                                                    <td className="py-3 px-4 text-slate-600">String</td>
                                                    <td className="py-3 px-4 text-center"><span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">Non</span></td>
                                                    <td className="py-3 px-4 text-slate-600">Couleur de fond hex (<code className="bg-slate-100 px-1 rounded text-xs">#ffffff</code>, <code className="bg-slate-100 px-1 rounded text-xs">#00ff00</code>). Absent = transparent</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-mono font-bold text-blue-700">remove_color</td>
                                                    <td className="py-3 px-4 text-slate-600">String</td>
                                                    <td className="py-3 px-4 text-center"><span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">Non</span></td>
                                                    <td className="py-3 px-4 text-slate-600">Couleur à supprimer manuellement (Chroma Key) hex (<code className="bg-slate-100 px-1 rounded text-xs">#00ff00</code>).</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-mono font-bold text-blue-700">remove_tolerance</td>
                                                    <td className="py-3 px-4 text-slate-600">Number</td>
                                                    <td className="py-3 px-4 text-center"><span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">Non</span></td>
                                                    <td className="py-3 px-4 text-slate-600">Tolérance de suppression (0-50). Défaut : 10.</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Response */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Réponse (succès — 200)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-green-600 uppercase mb-1">Content-Type</p>
                                            <p className="font-mono text-sm text-green-800">image/png</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-green-600 uppercase mb-1">Format</p>
                                            <p className="font-mono text-sm text-green-800">PNG RGBA (binaire)</p>
                                        </div>
                                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-green-600 uppercase mb-1">Filename</p>
                                            <p className="font-mono text-sm text-green-800">removed-bg.png</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-blue-800 text-sm">
                                            <strong>Important :</strong> La réponse est une image <strong>binaire</strong>, pas du JSON. Configurez votre client pour recevoir des données binaires.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Section>

                    {/* ===================== ERRORS ===================== */}
                    <Section id="errors" icon={AlertTriangle} title="Codes d'erreur">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-center py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider w-24">Code</th>
                                            <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Message</th>
                                            <th className="text-left py-3 px-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Cause</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { code: 400, msg: 'No image file provided', cause: "Aucun fichier dans le champ 'image'", color: 'yellow' },
                                            { code: 401, msg: 'Invalid API Key', cause: 'Clé API invalide ou inexistante', color: 'red' },
                                            { code: 401, msg: 'Missing API Key or Auth Token', cause: "Aucun header d'auth fourni", color: 'red' },
                                            { code: 402, msg: 'Insufficient credits', cause: 'Plus de crédits disponibles', color: 'orange' },
                                            { code: 413, msg: 'File too large (max 10MB)', cause: 'Fichier supérieur à 10 Mo', color: 'yellow' },
                                            { code: 415, msg: 'Invalid file type', cause: "Le fichier n'est pas une image", color: 'yellow' },
                                            { code: 500, msg: 'Internal Server Error', cause: 'Erreur serveur (modèle IA, etc.)', color: 'red' },
                                        ].map((err, i) => (
                                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                                <td className="py-3 px-4 text-center">
                                                    <span className={cn(
                                                        "text-xs font-bold px-2.5 py-1 rounded-full",
                                                        err.color === 'red' && "bg-red-100 text-red-700",
                                                        err.color === 'yellow' && "bg-yellow-100 text-yellow-700",
                                                        err.color === 'orange' && "bg-orange-100 text-orange-700",
                                                    )}>
                                                        {err.code}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-sm text-slate-800">{err.msg}</td>
                                                <td className="py-3 px-4 text-slate-600">{err.cause}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-4">
                            Toutes les erreurs retournent du JSON : <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{`{ "error": "message" }`}</code>
                        </p>
                    </Section>

                    {/* ===================== EXAMPLES ===================== */}
                    <Section id="examples" icon={Code2} title="Exemples de code">
                        <div className="space-y-8">
                            {/* cURL */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-5 h-5 text-blue-600" /> cURL — Fond transparent
                                </h3>
                                <CopyBlock
                                    language="bash"
                                    code={`curl -X POST https://openremover.vercel.app/api/v1/remove \\
  -H "x-api-key: sk_your_api_key" \\
  -F "image=@photo.jpg" \\
  --output result.png`}
                                />
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-5 h-5 text-blue-600" /> cURL — Fond blanc
                                </h3>
                                <CopyBlock
                                    language="bash"
                                    code={`curl -X POST https://openremover.vercel.app/api/v1/remove \\
  -H "x-api-key: sk_your_api_key" \\
  -F "image=@photo.jpg" \\
  -F "bg_color=#ffffff" \\
  -F "remove_color=#00ff00" \\
  -F "remove_tolerance=15" \\
  --output result.png`}
                                />
                            </div>

                            {/* JavaScript */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-5 h-5 text-blue-600" /> JavaScript (fetch)
                                </h3>
                                <CopyBlock
                                    language="javascript"
                                    code={`const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('bg_color', '#ffffff'); // optionnel
formData.append('remove_color', '#00ff00'); // optionnel (chroma key)
formData.append('remove_tolerance', '15'); // optionnel

const response = await fetch('https://openremover.vercel.app/api/v1/remove', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_your_api_key'
  },
  body: formData
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
// Utiliser l'URL pour afficher ou télécharger l'image`}
                                />
                            </div>

                            {/* Python */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ChevronRight className="w-5 h-5 text-blue-600" /> Python (requests)
                                </h3>
                                <CopyBlock
                                    language="python"
                                    code={`import requests

response = requests.post(
    'https://openremover.vercel.app/api/v1/remove',
    headers={'x-api-key': 'sk_your_api_key'},
    headers={'x-api-key': 'sk_your_api_key'},
    files={'image': open('photo.jpg', 'rb')},
    data={
        'bg_color': '#ffffff',
        'remove_color': '#00ff00',
        'remove_tolerance': '15'
    }
)

with open('result.png', 'wb') as f:
    f.write(response.content)`}
                                />
                            </div>
                        </div>
                    </Section>

                    {/* ===================== N8N ===================== */}
                    <Section id="n8n" icon={Zap} title="Configuration n8n (HTTP Request)">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">

                            {/* Step 1 */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">Ajouter un nœud HTTP Request</h3>
                                    <p className="text-slate-600">Dans votre workflow n8n, ajoutez un nœud <strong>HTTP Request</strong>.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Configuration générale</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {[
                                                    ['Method', 'POST'],
                                                    ['URL', 'https://openremover.vercel.app/api/v1/remove'],
                                                    ['Response Format', 'File ⚠️'],
                                                ].map(([key, val]) => (
                                                    <tr key={key} className="border-b border-slate-200 last:border-0">
                                                        <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">{key}</td>
                                                        <td className="py-3 px-4 font-mono text-sm text-slate-800">{val}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                        <p className="text-red-700 text-sm"><strong>IMPORTANT :</strong> Le Response Format doit être <strong>&quot;File&quot;</strong> (pas &quot;JSON&quot;) car l&apos;API retourne une image binaire.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Authentification (Header)</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr>
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Header Name</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-blue-700 font-bold">x-api-key</td>
                                                </tr>
                                                <tr className="border-t border-slate-200">
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Header Value</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-green-700">sk_your_api_key</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
                                        <Key className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-blue-800 text-sm"><strong>Astuce :</strong> Utilisez une Credential &quot;Header Auth&quot; dans n8n pour ne pas exposer votre clé en clair.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">4</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Body — Envoi de l&apos;image</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr className="border-b border-slate-200">
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Body Content Type</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-slate-800">Multipart Form Data</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Specify Body</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-slate-800">Using Fields Below</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <p className="text-sm font-bold text-slate-700 mb-3">Champs :</p>
                                    <div className="space-y-3">
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-green-600 uppercase mb-2">Champ 1 — Obligatoire</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <span className="text-slate-600 font-semibold">Field Name:</span> <span className="font-mono text-slate-800">image</span>
                                                <span className="text-slate-600 font-semibold">Type:</span> <span className="font-mono text-slate-800">n8n Binary Data</span>
                                                <span className="text-slate-600 font-semibold">Input Data Field:</span> <span className="font-mono text-slate-800">data</span>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Champ 2 — Optionnel (couleur de fond)</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <span className="text-slate-600 font-semibold">Field Name:</span> <span className="font-mono text-slate-800">bg_color</span>
                                                <span className="text-slate-600 font-semibold">Type:</span> <span className="font-mono text-slate-800">String</span>
                                                <span className="text-slate-600 font-semibold">Value:</span> <span className="font-mono text-slate-800">#ffffff</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">5</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-3">Options</h3>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr className="border-b border-slate-200">
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Timeout</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-slate-800">60000 ms (60 secondes)</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-4 font-bold text-slate-700 bg-white w-48">Output Field</td>
                                                    <td className="py-3 px-4 font-mono text-sm text-slate-800">data</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workflow Examples */}
                        <div className="mt-8 space-y-4">
                            <h3 className="text-lg font-bold text-slate-900">Exemples de workflows</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    {
                                        emoji: '🔗',
                                        title: 'Webhook',
                                        flow: 'Webhook → OpenRemover → Email/Slack',
                                        desc: 'Traitement automatique des images reçues par webhook.',
                                    },
                                    {
                                        emoji: '📁',
                                        title: 'Google Drive Batch',
                                        flow: 'G. Drive Trigger → Download → OpenRemover → Upload',
                                        desc: 'Traitement automatique des nouveaux fichiers.',
                                    },
                                    {
                                        emoji: '📋',
                                        title: 'Formulaire',
                                        flow: 'Form Trigger → OpenRemover → Respond',
                                        desc: "Formulaire d'upload pour vos utilisateurs.",
                                    },
                                ].map((wf) => (
                                    <div key={wf.title} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                        <p className="text-2xl mb-2">{wf.emoji}</p>
                                        <h4 className="font-bold text-slate-900 mb-1">{wf.title}</h4>
                                        <p className="text-xs font-mono text-blue-600 mb-2">{wf.flow}</p>
                                        <p className="text-sm text-slate-500">{wf.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    {/* ===================== CREDITS ===================== */}
                    <Section id="credits" icon={Coins} title="Système de crédits">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[
                                { name: 'Free', credits: 10, price: 'Gratuit', highlight: false },
                                { name: 'Small', credits: 50, price: '$4.99', highlight: false },
                                { name: 'Medium', credits: 150, price: '$12.99', highlight: true },
                                { name: 'Large', credits: 500, price: '$34.99', highlight: false },
                            ].map((plan) => (
                                <div key={plan.name} className={cn(
                                    "rounded-2xl p-6 text-center border-2 transition-shadow",
                                    plan.highlight
                                        ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10"
                                        : "border-slate-200 bg-white"
                                )}>
                                    <p className="text-sm font-bold text-slate-500 uppercase mb-1">{plan.name}</p>
                                    <p className="text-3xl font-extrabold text-slate-900">{plan.credits}</p>
                                    <p className="text-xs text-slate-400 mb-3">crédits</p>
                                    <p className={cn("text-lg font-bold", plan.highlight ? "text-blue-600" : "text-slate-700")}>{plan.price}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                            <Coins className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div className="text-sm text-slate-600">
                                <strong>1 crédit = 1 image traitée.</strong> Les crédits sont décomptés atomiquement (pas de double-consommation).
                                Si crédits = 0, l&apos;API retourne une erreur <code className="bg-slate-200 px-1 rounded text-xs">402</code>.
                            </div>
                        </div>
                    </Section>

                    {/* ===================== LIMITS ===================== */}
                    <Section id="limits" icon={Gauge} title="Limites et quotas">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <tbody>
                                    {[
                                        ['Taille max du fichier', '10 Mo'],
                                        ['Formats acceptés', 'PNG, JPG/JPEG, WebP'],
                                        ['Timeout serveur', '60 secondes'],
                                        ['Format de sortie', 'PNG (RGBA)'],
                                        ['Cold start (1er appel)', '~10-30 secondes'],
                                        ['Appels suivants', '~3-10 secondes'],
                                    ].map(([key, val], i) => (
                                        <tr key={key} className={cn("border-b border-slate-100 last:border-0", i % 2 === 1 && "bg-slate-50/50")}>
                                            <td className="py-4 px-6 font-bold text-slate-700 w-64">{key}</td>
                                            <td className="py-4 px-6 text-slate-600">{val}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-blue-800 text-sm">
                                <strong>Cold start :</strong> Le premier appel après inactivité est plus lent car le modèle IA (~100 Mo) se charge en mémoire. Les appels suivants sont beaucoup plus rapides.
                            </p>
                        </div>
                    </Section>

                    {/* Footer CTA */}
                    <div className="bg-slate-900 rounded-3xl p-10 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[120px] opacity-20 transform translate-x-20 -translate-y-20" />
                        <div className="relative z-10">
                            <h2 className="text-3xl font-extrabold mb-3">Prêt à commencer ?</h2>
                            <p className="text-slate-400 text-lg mb-6">Créez votre clé API en quelques secondes et commencez à intégrer.</p>
                            <div className="flex items-center justify-center gap-4">
                                <Link href="/dashboard" className="bg-white text-slate-900 font-bold px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
                                    Obtenir une clé API
                                </Link>
                                <Link href="/" className="border border-slate-600 text-slate-300 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-colors">
                                    Essayer l&apos;app
                                </Link>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
