export default function CMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-slate-900">
        <div className="px-5 py-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DCOS</p>
          <p className="text-base font-bold text-white">Command Center</p>
          <p className="mt-0.5 text-xs text-slate-400">CM&apos;s Office</p>
        </div>
        <nav className="mt-1 space-y-0.5 px-2 text-sm">
          {[
            { href: "/cm", label: "Live Overview" },
            { href: "/cm/analytics", label: "Analytics" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
