'use client';

import type { OperationalReportCheck } from '../lib/supabase/data';

const STATUS_LABEL: Record<OperationalReportCheck['status'], string> = {
  ok: 'Conforme',
  alert: 'Alerte',
  critical: 'Critique',
  not_applicable: 'Non applicable',
  not_checked: 'Non vérifié',
};

export function numericOriginChecks(checks: OperationalReportCheck[] | undefined) {
  return (checks ?? []).filter((check) => typeof check.valueNumeric === 'number' && Number.isFinite(check.valueNumeric));
}

export function DossierOriginMeasures({ sourceReportId, sourceReportReference, checks }: {
  sourceReportId?: string | null;
  sourceReportReference?: string | null;
  checks?: OperationalReportCheck[];
}) {
  const measures = numericOriginChecks(checks);
  if (!sourceReportId) {
    return <p className="origin-measure-missing">Mesure d’origine non reliée à cette fiche</p>;
  }
  if (!sourceReportReference && measures.length === 0) {
    return <p className="origin-measure-missing">Rapport d’origine relié ; ses mesures ne sont pas disponibles sur cette fiche.</p>;
  }
  return (
    <div className="origin-measures">
      {sourceReportReference ? <p>Rapport d’origine : <strong>{sourceReportReference}</strong></p> : null}
      {measures.length ? (
        <ul aria-label="Mesures du rapport d’origine">
          {measures.map((check) => (
            <li key={check.code}>
              <span>{check.label}</span>
              <b>{`${check.valueNumeric!.toLocaleString('fr-FR')}${check.unit ? ` ${check.unit}` : ''}`}</b>
              <em>{STATUS_LABEL[check.status]}</em>
            </li>
          ))}
        </ul>
      ) : <p>Le rapport relié ne contient pas de mesure chiffrée.</p>}
    </div>
  );
}
