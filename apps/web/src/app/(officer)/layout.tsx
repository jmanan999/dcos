export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-brand-900 text-white">
        <div className="px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">DCOS</p>
          <p className="text-sm font-bold text-white">Officer Console</p>
        </div>
        <nav className="mt-2 space-y-1 px-2 text-sm">
          {[
            { href: "/officer", label: "Dashboard" },
            { href: "/officer/queue", label: "My Queue" },
            { href: "/officer/admin", label: "Officer Management" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-blue-100 hover:bg-white/10 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
