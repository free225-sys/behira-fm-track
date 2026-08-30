import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const page = await readFile(path.join(root, 'app', 'page.tsx'), 'utf8')
const css = await readFile(path.join(root, 'app', 'globals.css'), 'utf8')
const notice = await readFile(path.join(root, 'app', 'components', 'SyncStatusNotice.tsx'), 'utf8')
const offlineStatus = await readFile(path.join(root, 'app', 'components', 'OfflineSyncStatus.tsx'), 'utf8')
const offlineHook = await readFile(path.join(root, 'app', 'lib', 'offline', 'useOfflineSync.ts'), 'utf8')
const offlineSync = await readFile(path.join(root, 'app', 'lib', 'offline', 'sync.ts'), 'utf8')
const source = `${page}\n${css}\n${notice}\n${offlineStatus}\n${offlineHook}\n${offlineSync}`

const checks = [
  ['Contrat partagé des six états', ['demo-volatile', 'online-required', 'queued-local', 'transmitting', 'server-confirmed', 'error'].every((state) => notice.includes(`'${state}'`) || notice.includes(`${state}:`))],
  ['Démonstration explicitement volatile', notice.includes('Démonstration locale — non enregistrée') && notice.includes('peuvent être perdues en la quittant')],
  ['Mode serveur sans fausse promesse hors ligne', notice.includes('Connexion requise pour enregistrer') && notice.includes('Aucun mode hors ligne ni reprise automatique')],
  ['Échec et reprise accessibles', notice.includes("role={state === 'error' ? 'alert' : 'status'}") && notice.includes('onRetry') && notice.includes('Réessayer')],
  ['Rondes raccordées à la file hors ligne', page.includes('<OfflineSyncStatus enabled={persistenceEnabled}') && page.includes('await enqueueRound({') && page.includes('saveDraft<RoundDraft>')],
  ['Actions terrain identifiées comme simulation', page.includes('Illustration de maquette · aucun fichier téléversé') && page.includes('Appliquer dans la démonstration') && page.includes('label="État de l’action terrain"')],
  ['Preuve mise en file avec états et retry', page.includes('await offlineSync.enqueueProof({') && page.includes("return 'queued-local'") && page.includes("proofTransferState === 'error' && pendingProof")],
  ['Confirmation serveur réservée au succès réel', offlineSync.includes('serverResult') && offlineSync.includes('status: "synced"') && page.includes("return 'error'") && page.includes("return 'demo-volatile'")],
  ['Reprise réseau et conflits explicites', offlineHook.includes('window.addEventListener("online"') && offlineStatus.includes('Aucun écrasement automatique') && offlineStatus.includes('Assistance requise')],
  ['Aucun ancien libellé trompeur', !['Mode hors ligne actif','Brouillon enregistré localement','Brouillon conservé sur cet appareil','prête à synchroniser','compression prévue avant synchronisation','Simuler le retour réseau'].some((text) => page.includes(text))],
  ['Responsive et mouvement réduit', css.includes('@media (max-width:700px){.sync-status-notice{flex-wrap:wrap}') && css.includes('@media (prefers-reduced-motion:reduce){.sync-status-notice.is-transmitting .sync-status-icon{animation:none}')],
  ['Design system respecté', ['var(--info-border)','var(--warning-surface)','var(--success-surface)','var(--danger-surface)','var(--radius-md)','var(--font-size-label)'].every((token) => source.includes(token))],
]

for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`)
const failures = checks.filter(([, ok]) => !ok)
if (failures.length) {
  process.exitCode = 1
  throw new Error(`${failures.length} contrôle(s) de résilience en échec`)
}
console.log(`\n${checks.length} contrôles de résilience terrain réussis.`)
