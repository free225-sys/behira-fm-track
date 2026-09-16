'use client';

import type { EquipmentCard } from '../../lib/ui-contract/building-health.ts';
import {
  familyLabel,
  formatInstant,
  palierFromScore,
  palierTone,
} from '../../lib/ui-contract/display.ts';
import { ControlValidityBadge, MetierStatusBadge } from './StatusBadge';

function isAtRisk(item: EquipmentCard) {
  return item.operationalStatus === 'degraded'
    || item.operationalStatus === 'unavailable'
    || item.operationalStatus === 'control_due';
}

export function EquipmentTable({
  equipment,
  onOpen,
  atRiskOnly = false,
}: {
  equipment: EquipmentCard[];
  onOpen?: (item: EquipmentCard) => void;
  atRiskOnly?: boolean;
}) {
  const visible = (atRiskOnly ? equipment.filter(isAtRisk) : equipment)
    .slice()
    .sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
  const groups = new Map<string, EquipmentCard[]>();
  visible.forEach((item) => {
    const key = familyLabel(item.family);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });

  if (visible.length === 0) {
    return <p className="health-insufficient" role="status">Aucun équipement dans ce filtre.</p>;
  }

  return (
    <div className="equipment-table-wrap">
      <table className="equipment-table">
        <thead>
          <tr>
            <th>Équipement</th>
            <th>Statut métier</th>
            <th>Score</th>
            <th>Dossiers</th>
            <th>Ronde du jour</th>
            <th>Responsable</th>
          </tr>
        </thead>
        {[...groups.entries()].map(([family, items]) => (
          <tbody key={family}>
            <tr className="equipment-table-group"><th colSpan={6}>{family}</th></tr>
            {items.map((item) => {
              const palier = item.score == null ? null : palierFromScore(item.score);
              const shown = item.score;
              const round = item.todaysRound;
              return (
                <tr
                  key={item.id}
                  className={onOpen ? 'is-action' : undefined}
                  tabIndex={onOpen ? 0 : undefined}
                  onClick={onOpen ? () => onOpen(item) : undefined}
                  onKeyDown={onOpen ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpen(item);
                    }
                  } : undefined}
                >
                  <td data-label="Équipement">
                    <b className="equipment-reference">{item.code}</b>
                    <small>{item.name}{item.zone ? ` · ${item.zone}` : ''}</small>
                  </td>
                  <td data-label="Statut métier">
                    <span className="status-stack">
                      <MetierStatusBadge status={item.operationalStatus} />
                      <ControlValidityBadge value={item.controlValidity} />
                    </span>
                  </td>
                  <td data-label="Score">
                    {shown == null ? '—' : (
                      <span className={`equipment-table-score${palier ? ` is-${palierTone(palier)}` : ''}`}>
                        {shown}
                        <i className="equipment-table-bar" style={{ width: `${shown}%` }} />
                        {item.scoreProvisional ? <small>provisoire</small> : null}
                      </span>
                    )}
                  </td>
                  <td data-label="Dossiers">{item.dossierCount ?? '—'}</td>
                  <td data-label="Ronde du jour">
                    {round?.state === 'done' && round.doneAt
                      ? `Faite ${formatInstant(round.doneAt)}`
                      : round?.state === 'due'
                        ? 'À faire'
                        : round?.missedYesterday
                          ? 'Hier manquée'
                          : '—'}
                  </td>
                  <td data-label="Responsable">{item.responsible ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
      <p className="health-equip-hint">Scores provisoires. Le statut métier n’est pas déduit du chiffre. Les poids d’équipement ne sont pas activés.</p>
    </div>
  );
}
