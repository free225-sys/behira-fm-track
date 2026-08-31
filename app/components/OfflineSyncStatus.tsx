import type { QueueCounts } from "../lib/offline/types";

type OfflineSyncStatusProps = {
  enabled: boolean;
  online: boolean;
  running: boolean;
  counts: QueueCounts;
  latestIssue?: { status:"failed"|"conflict"; message:string } | null;
  onRetry: () => void;
};

export function OfflineSyncStatus({ enabled, online, running, counts, latestIssue, onRetry }: OfflineSyncStatusProps) {
  if (!enabled) {
    return <section className="sync-banner is-demo" role="status"><span className="status-dot local" /><div><b>Mode démonstration</b><small>Les interactions de cette vue ne sont pas enregistrées sur le serveur métier.</small></div></section>;
  }

  const blocked = counts.failed + counts.conflict;
  const waiting = counts.pending + counts.syncing;
  const title = !online
    ? "Hors ligne · saisie protégée sur cet appareil"
    : running
      ? "Synchronisation en cours"
      : blocked
        ? "Synchronisation à vérifier"
        : waiting
          ? "En attente de synchronisation"
          : "Toutes les saisies sont synchronisées";
  const detail = blocked
    ? `${counts.failed} échec${counts.failed > 1 ? "s" : ""} · ${counts.conflict} conflit${counts.conflict > 1 ? "s" : ""}. Aucun écrasement automatique.`
    : waiting
      ? `${waiting} élément${waiting > 1 ? "s" : ""} conservé${waiting > 1 ? "s" : ""} dans la file locale.`
      : "Aucune donnée terrain en attente sur cette session.";

  return <section className={`sync-banner ${online ? "is-online" : "is-offline"} ${blocked ? "has-error" : ""}`} role="status" aria-live="polite">
    <span className={`status-dot ${online ? "online" : "local"}`} />
    <div><b>{title}</b><small>{detail}</small>{latestIssue && <small className="sync-error-detail">Dernier blocage : {latestIssue.message}{latestIssue.status === "conflict" ? " · Assistance requise, copie locale conservée." : ""}</small>}</div>
    {(blocked > 0 || waiting > 0) && <button type="button" disabled={!online || running} onClick={onRetry}>{running ? "Synchronisation…" : "Réessayer maintenant"}</button>}
  </section>;
}
