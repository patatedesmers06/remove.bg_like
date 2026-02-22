import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center shadow-sm">
            <div className="w-3 h-3 bg-white rounded-full opacity-50" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">OpenRemover</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
          <Link href="/docs" className="hover:text-slate-900 transition-colors">API Docs</Link>
          <a href="#" className="hover:text-slate-900 transition-colors">GitHub</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms & Privacy</a>
        </div>
        
        <div className="text-sm text-slate-400 font-medium">
          © {new Date().getFullYear()} OpenRemover.
        </div>
      </div>
    </footer>
  );
}
