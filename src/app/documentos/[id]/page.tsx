/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { DocumentRenderer } from "@/components/document-renderer";
import { PrintButton } from "@/components/print-button";
import { db } from "@/lib/db";
import type { DocumentSnapshot } from "@/lib/documents";
import { dateMx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IssuedDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issued = await db.issuedDocument.findUnique({ where: { id } });
  if (!issued || !issued.snapshot || typeof issued.snapshot !== "object" || Array.isArray(issued.snapshot)) notFound();
  const snapshot = issued.snapshot as unknown as DocumentSnapshot;
  if (snapshot.version !== 1 || !snapshot.clinic || !snapshot.body || !snapshot.values) notFound();
  return <div className="document-screen"><div className="document-screen-actions"><PrintButton /></div><article className="document-print-page">
    <header className="document-header"><div className="document-brand">{snapshot.clinic.logoUrl ? <img alt={snapshot.clinic.name} src={snapshot.clinic.logoUrl} /> : <strong>{snapshot.clinic.name}</strong>}</div><div className="document-clinic-data">{snapshot.clinic.legalName && <b>{snapshot.clinic.legalName}</b>}{snapshot.clinic.rfc && <span>RFC {snapshot.clinic.rfc}</span>}{snapshot.clinic.address && <span>{snapshot.clinic.address}</span>}{snapshot.clinic.phone && <span>Tel. {snapshot.clinic.phone}</span>}</div></header>
    <main><h1>{snapshot.title}</h1><DocumentRenderer body={snapshot.body} blocks={snapshot.blocks} type={snapshot.type} values={snapshot.values} /></main>
    <footer><span>{snapshot.clinic.footer}</span><span>Emitido: {dateMx(snapshot.issuedAt, { dateStyle: "long", timeStyle: "short" })} · Folio {id.slice(-8).toUpperCase()}</span></footer>
  </article></div>;
}
