'use client';

import { Badge } from '../ui';

/** Une pastille de saisie : neutre en démo, bleu si la ronde est enregistrée, orange en recette. */
export function RoundModeBadge({ persistenceEnabled, isTest = false }: { persistenceEnabled: boolean; isTest?: boolean }) {
  const tone = isTest ? 'orange' : persistenceEnabled ? 'blue' : 'neutral';
  const label = isTest ? 'Saisie recette' : persistenceEnabled ? 'Saisie réelle' : 'Démo';
  return <Badge className="round-mode-badge" tone={tone}>{label}</Badge>;
}
