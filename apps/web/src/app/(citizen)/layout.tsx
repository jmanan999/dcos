import Link from "next/link";

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-brand-500 text-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
              D
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">DCOS Delhi</p>
              <p className="text-xs text-blue-200">Citizen Portal</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-white/80 hover:text-white">
              File Complaint
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
