'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, IconButton } from './ui';

export type ErrorRuleId = 'critical' | 'sla' | 'health' | 'sync';
export type ErrorChannel = 'in-app' | 'email';
export type ErrorPersonaId = 'facility' | 'administration' | 'electricite' | 'eau_incendie' | 'rondes_assistance';
export type ErrorAnomaly = { id: string; asset: string; title: string; priority: string; status: string; delayed: boolean };
export type ErrorEquipment = { code: string; label: string; health: number };

type ErrorRule = {
  id: ErrorRuleId;
  active: boolean;
  channels: ErrorChannel[];
};

type ErrorItem = {
  id: string;
  rule: ErrorRuleId;
  title: string;
  detail: string;
  when: string;
  tone: 'danger' | 'warning' | 'info';
  anomalyId?: string;
  view: 'detail' | 'equipment' | 'workspace';
};

const STORAGE_RULES = 'behira.error-notification-rules.v1';
const STORAGE_READ = 'behira.error-notifications-read.v1';
const RULES_EVENT = 'behira-error-rules';

const PERIMETER: Record<ErrorPersonaId, string[] | null> = {
  administration: null,
  facility: null,
  electricite: ['DEMO-GE', 'DEMO-ASC-1/2', 'DEMO-ASC-1', 'DEMO-ASC-2'],
  eau_incendie: ['DEMO-EAU', 'DEMO-SSI'],
  rondes_assistance: ['DEMO-ESP', 'DEMO-RND'],
};

export const ERROR_RULE_CATALOG: Array<{
  id: ErrorRuleId;
  label: string;
  trigger: string;
  audience: string;
  defaultChannels: ErrorChannel[];
}> = [
  { id: 'critical', label: 'Alerte critique', trigger: 'Anomalie Critique encore ouverte', audience: 'Facility Manager et agent du périmètre', defaultChannels: ['in-app', 'email'] },
  { id: 'sla', label: 'Dossier en retard', trigger: 'Échéance dépassée, dossier non clôturé', audience: 'Facility Manager', defaultChannels: ['in-app'] },
  { id: 'health', label: 'Score équipement < 70', trigger: 'Santé passée sous le seuil critique', audience: 'Facility Manager et Administration', defaultChannels: ['in-app', 'email'] },
  { id: 'sync', label: 'Échec d’enregistrement', trigger: 'La donnée n’a pas été confirmée par le serveur', audience: 'Utilisateur connecté', defaultChannels: ['in-app'] },
];

const DEFAULT_RULES: ErrorRule[] = ERROR_RULE_CATALOG.map((item) => ({
  id: item.id,
  active: true,
  channels: [...item.defaultChannels],
}));

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function readRules(): ErrorRule[] {
  const stored = readJson<ErrorRule[]>(STORAGE_RULES, DEFAULT_RULES);
  return ERROR_RULE_CATALOG.map((item) => stored.find((rule) => rule.id === item.id) ?? DEFAULT_RULES.find((rule) => rule.id === item.id)!);
}

function persistRules(rules: ErrorRule[]) {
  localStorage.setItem(STORAGE_RULES, JSON.stringify(rules));
  window.dispatchEvent(new Event(RULES_EVENT));
}

function inPerimeter(asset: string, personaId: ErrorPersonaId) {
  const allowed = PERIMETER[personaId];
  return !allowed || allowed.some((code) => asset === code || asset.startsWith(code.replace(/\/.*$/, '')));
}

export function deriveErrorNotifications({
  anomalies,
  equipment,
  dataState,
  personaId,
  rules,
}: {
  anomalies: ErrorAnomaly[];
  equipment: ErrorEquipment[];
  dataState: 'demo' | 'loading' | 'live' | 'fallback';
  personaId: ErrorPersonaId;
  rules: ErrorRule[];
}): ErrorItem[] {
  const enabled = new Set(rules.filter((rule) => rule.active && rule.channels.includes('in-app')).map((rule) => rule.id));
  const items: ErrorItem[] = [];

  if (enabled.has('critical')) {
    anomalies.filter((item) => item.priority === 'Critique' && item.status !== 'Clôturée').forEach((item) => {
      items.push({
        id: `critical-${item.id}`,
        rule: 'critical',
        title: `${item.id} · Critique`,
        detail: `${item.asset} · ${item.title}`,
        when: 'À traiter',
        tone: 'danger',
        anomalyId: item.id,
        view: 'detail',
      });
    });
  }

  if (enabled.has('sla')) {
    anomalies.filter((item) => item.delayed && item.status !== 'Clôturée').forEach((item) => {
      items.push({
        id: `sla-${item.id}`,
        rule: 'sla',
        title: `${item.id} · En retard`,
        detail: `${item.asset} · échéance dépassée`,
        when: 'SLA',
        tone: 'warning',
        anomalyId: item.id,
        view: 'detail',
      });
    });
  }

  if (enabled.has('health')) {
    equipment.filter((item) => item.health < 70).forEach((item) => {
      items.push({
        id: `health-${item.code}`,
        rule: 'health',
        title: `${item.code} · ${item.health}/100`,
        detail: `${item.label} sous le seuil critique 70`,
        when: 'Santé',
        tone: 'danger',
        view: 'equipment',
      });
    });
  }

  if (enabled.has('sync') && dataState === 'fallback') {
    items.push({
      id: 'sync-fallback',
      rule: 'sync',
      title: 'Échec de synchronisation',
      detail: 'Les données serveur n’ont pas pu être confirmées. Repli local actif.',
      when: 'Technique',
      tone: 'info',
      view: 'workspace',
    });
  }

  return items.filter((item) => {
    const field = personaId === 'electricite' || personaId === 'eau_incendie' || personaId === 'rondes_assistance';
    if (item.rule === 'health' && field) return false;
    if (item.rule === 'sla' && field) return false;
    if (field && item.anomalyId) {
      const anomaly = anomalies.find((entry) => entry.id === item.anomalyId);
      return anomaly ? inPerimeter(anomaly.asset, personaId) : false;
    }
    return true;
  });
}

function useErrorRules() {
  const [rules, setRules] = useState<ErrorRule[]>(DEFAULT_RULES);

  useEffect(() => {
    const sync = () => setRules(readRules());
    sync();
    window.addEventListener(RULES_EVENT, sync);
    return () => window.removeEventListener(RULES_EVENT, sync);
  }, []);

  const update = (id: ErrorRuleId, patch: Partial<ErrorRule>) => {
    const next = readRules().map((rule) => rule.id === id ? { ...rule, ...patch } : rule);
    persistRules(next);
    setRules(next);
  };

  return { rules, update };
}

function Switch({ on, label, disabled, onToggle }: { on: boolean; label: string; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`notif-switch ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}>
      <i />
    </button>
  );
}

export function ErrorNotificationRules({ canEdit }: { canEdit: boolean }) {
  const { rules, update } = useErrorRules();

  return (
    <section className="error-rule-list" aria-labelledby="error-rules-title">
      <header>
        <p className="design-kicker">NOTIFICATIONS D’ERREUR</p>
        <h3 id="error-rules-title">Quand prévenir, et par quel canal</h3>
        <p>Réglage local à cet appareil. L’e-mail n’est pas envoyé tant que le serveur n’est pas raccordé.</p>
      </header>
      <ul>
        {ERROR_RULE_CATALOG.map((item) => {
          const rule = rules.find((entry) => entry.id === item.id)!;
          return (
            <li key={item.id} className={rule.active ? '' : 'is-off'}>
              <div>
                <b>{item.label}</b>
                <small>{item.trigger}</small>
                <span>{item.audience}</span>
              </div>
              <div className="error-rule-controls">
                <Switch on={rule.active} label={`${rule.active ? 'Désactiver' : 'Activer'} ${item.label}`} disabled={!canEdit} onToggle={() => canEdit && update(item.id, { active: !rule.active })} />
                <label>
                  <input
                    type="checkbox"
                    checked={rule.channels.includes('email')}
                    disabled={!canEdit || !rule.active}
                    onChange={() => {
                      const channels: ErrorChannel[] = rule.channels.includes('email')
                        ? rule.channels.filter((channel) => channel !== 'email')
                        : [...rule.channels, 'email'];
                      if (!channels.includes('in-app')) channels.unshift('in-app');
                      update(item.id, { channels });
                    }}
                  />
                  E-mail (simulé)
                </label>
              </div>
            </li>
          );
        })}
      </ul>
      {!canEdit ? <p className="error-rule-lock">Lecture seule pour ce profil. Facility Manager et Administration peuvent modifier les règles.</p> : <p className="error-rule-lock">In-app reste le canal de secours. Désactiver une règle coupe aussi la pastille.</p>}
    </section>
  );
}

export function NotificationBell({
  personaId,
  anomalies,
  equipment,
  dataState,
  canConfigure,
  canOpenEquipment,
  onOpenAnomaly,
  onOpenEquipment,
  onOpenHome,
}: {
  personaId: ErrorPersonaId;
  anomalies: ErrorAnomaly[];
  equipment: ErrorEquipment[];
  dataState: 'demo' | 'loading' | 'live' | 'fallback';
  canConfigure: boolean;
  canOpenEquipment: boolean;
  onOpenAnomaly: (id: string) => void;
  onOpenEquipment: () => void;
  onOpenHome: () => void;
}) {
  const { rules } = useErrorRules();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'rules'>('inbox');
  const [readIds, setReadIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReadIds(readJson<string[]>(STORAGE_READ, []));
  }, []);

  const items = useMemo(
    () => deriveErrorNotifications({ anomalies, equipment, dataState, personaId, rules }),
    [anomalies, equipment, dataState, personaId, rules],
  );
  const unread = items.filter((item) => !readIds.includes(item.id)).length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = (id: string) => {
    const next = Array.from(new Set([...readIds, id]));
    setReadIds(next);
    localStorage.setItem(STORAGE_READ, JSON.stringify(next));
  };

  const markAll = () => {
    const next = items.map((item) => item.id);
    setReadIds(next);
    localStorage.setItem(STORAGE_READ, JSON.stringify(next));
  };

  const openItem = (item: ErrorItem) => {
    markRead(item.id);
    setOpen(false);
    if (item.view === 'detail' && item.anomalyId) onOpenAnomaly(item.anomalyId);
    else if (item.view === 'equipment') {
      if (canOpenEquipment) onOpenEquipment();
      else onOpenHome();
    } else onOpenHome();
  };

  return (
    <div className="notif-anchor" ref={rootRef}>
      <IconButton
        aria-label={unread ? `Notifications, ${unread} non lues` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2a3.4 3.4 0 0 0-3.4 3.4v1.1c0 .9-.3 1.8-.9 2.5l-.5.6c-.4.4-.2 1.2.4 1.2h9.8c.6 0 .8-.8.4-1.2l-.5-.6a4 4 0 0 1-.9-2.5V6.6A3.4 3.4 0 0 0 10 3.2Z"/><path d="M8.2 15.2a1.8 1.8 0 0 0 3.6 0"/></svg>
        {unread > 0 ? <span className="notification-dot" /> : null}
      </IconButton>
      {open && (
        <section className="notif-panel" role="dialog" aria-labelledby="notif-panel-title">
          <header className="notif-panel-head">
            <div>
              <p className="design-kicker">ALERTES D’ERREUR</p>
              <h2 id="notif-panel-title">Notifications</h2>
            </div>
            {unread > 0 ? <button type="button" className="text-button" onClick={markAll}>Tout marquer lu</button> : null}
          </header>
          <div className="notif-tabs" role="tablist" aria-label="Notifications">
            <button type="button" role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'active' : ''} onClick={() => setTab('inbox')}>File {unread ? <span className="panel-count">{unread}</span> : null}</button>
            <button type="button" role="tab" aria-selected={tab === 'rules'} className={tab === 'rules' ? 'active' : ''} onClick={() => setTab('rules')}>Règles</button>
          </div>
          {tab === 'inbox' ? (
            items.length === 0 ? (
              <div className="empty-state compact"><span>✓</span><h3>Aucune alerte active</h3><p>Les règles d’erreur n’ont rien à signaler pour ce profil.</p></div>
            ) : (
              <ul className="notif-inbox">
                {items.map((item) => (
                  <li key={item.id}>
                    <button type="button" className={readIds.includes(item.id) ? 'is-read' : ''} onClick={() => openItem(item)}>
                      <Badge tone={item.tone === 'danger' ? 'critical' : item.tone === 'warning' ? 'orange' : 'blue'}>{item.when}</Badge>
                      <b>{item.title}</b>
                      <small>{item.detail}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ErrorNotificationRules canEdit={canConfigure} />
          )}
        </section>
      )}
    </div>
  );
}
