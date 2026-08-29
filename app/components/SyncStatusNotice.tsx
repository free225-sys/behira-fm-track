'use client';

import { Button } from './ui';

export type SyncStatusState =
  | 'demo-volatile'
  | 'online-required'
  | 'transmitting'
  | 'server-confirmed'
  | 'error';

const syncStatusContract: Record<SyncStatusState, { icon: string; title: string; description: string }> = {
  'demo-volatile': {
    icon: '!',
    title: 'Démonstration locale — non enregistrée',
    description: 'Les saisies restent dans cette page et peuvent être perdues en la quittant. Aucun envoi automatique.',
  },
  'online-required': {
    icon: '↗',
    title: 'Connexion requise pour enregistrer',
    description: 'Cette action écrit directement sur le serveur. Aucun mode hors ligne ni reprise automatique dans cette version.',
  },
  transmitting: {
    icon: '↻',
    title: 'Envoi en cours',
    description: 'Gardez cette page ouverte jusqu’à la confirmation du serveur.',
  },
  'server-confirmed': {
    icon: '✓',
    title: 'Enregistrement serveur confirmé',
    description: 'La donnée a été reçue par le serveur et peut être relue depuis le dossier.',
  },
  error: {
    icon: '!',
    title: 'Échec de l’enregistrement',
    description: 'La donnée n’a pas été confirmée par le serveur. Vérifiez la connexion puis réessayez.',
  },
};

export function SyncStatusNotice({
  state,
  compact = false,
  label = 'État de l’enregistrement',
  onRetry,
}: {
  state: SyncStatusState;
  compact?: boolean;
  label?: string;
  onRetry?: () => void;
}) {
  const content = syncStatusContract[state];

  return (
    <div
      className={`sync-status-notice is-${state} ${compact ? 'is-compact' : ''}`}
      role={state === 'error' ? 'alert' : 'status'}
      aria-label={label}
      aria-live="polite"
    >
      <span className="sync-status-icon" aria-hidden="true">{content.icon}</span>
      <span className="sync-status-copy">
        <b>{content.title}</b>
        <small>{content.description}</small>
      </span>
      {state === 'error' && onRetry ? <Button variant="secondary" onClick={onRetry}>Réessayer</Button> : null}
    </div>
  );
}
