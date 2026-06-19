export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-brand-500">DCOS Delhi</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Public</span>
          </div>
          <a
            href="/"
            className="text-sm text-brand-500 hover:underline"
          >
            File a Complaint →
          </a>
        </div>
      </header>
      {children}
    </div>
  );
}
