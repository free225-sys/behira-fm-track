'use client';

export function InsufficientNote({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="health-insufficient" role="status">
      <b>Données insuffisantes</b>
      <p>{detail ? `${title}. ${detail}` : title}</p>
    </div>
  );
}
