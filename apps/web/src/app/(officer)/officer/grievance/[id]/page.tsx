import type { Metadata } from "next";

export const metadata: Metadata = { title: "Grievance Detail" };

type Props = { params: Promise<{ id: string }> };

export default async function GrievanceDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Grievance {id}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Full context, media, map, proof upload — built in Epic 7
      </p>
    </div>
  );
}
