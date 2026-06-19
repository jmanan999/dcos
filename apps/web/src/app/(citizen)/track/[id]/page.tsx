import type { Metadata } from "next";

export const metadata: Metadata = { title: "Track Complaint" };

type Props = { params: Promise<{ id: string }> };

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-xl font-bold text-slate-900">Complaint #{id}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Live tracking timeline — built in Epic 8
      </p>
    </div>
  );
}
