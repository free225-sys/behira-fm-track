import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Button, Card, CardHeader, Field, IconButton } from '../components/ui';
import { SharedSpecimen } from './shared-specimen';

export const metadata: Metadata = {
  title: 'Système de design · BEHIRA FM / GB TRACK',
  description: 'Spécimen des tokens sémantiques BEHIRA — designer only, hors navigation produit.',
};

const surfaces = [
  ['--background', 'Canvas'],
  ['--surface', 'Carte, en-tête de page'],
  ['--surface-muted', 'Bandeau interne, zebra'],
  ['--surface-emphasis', 'Surbrillance, compte démo actif'],
];

const inks = [
  ['--foreground', 'Titre, corps'],
  ['--foreground-muted', 'Légende, aide'],
  ['--border', 'Contour calme'],
  ['--border-strong', 'Contour de contrôle'],
];

const brand = [
  ['--brand', 'Action principale'],
  ['--brand-strong', 'Égal à --chrome'],
  ['--brand-foreground', 'Texte sur bouton brand'],
  ['--mark', 'Glyphe B — distinct de --brand (DEC-013)'],
  ['--teal', 'Accent courant, pas le warning'],
  ['--accent', 'Alias de --teal'],
];

const chrome = [
  ['--chrome', 'Bandeau de navigation'],
  ['--on-chrome', 'Titre et item actif'],
  ['--on-chrome-muted', 'Sous-marque, site'],
  ['--on-chrome-idle', 'Destination inactive'],
  ['--on-chrome-hover', 'Survol'],
  ['--chrome-accent', 'Soulignement actif'],
];

const triplets = [
  ['success', 'Succès / clôturé'],
  ['warning', 'Attention / délégation'],
  ['danger', 'Critique / retard'],
  ['info', 'Information / marque'],
  ['neutral', 'Repos / consultation'],
];

const typeScale = [
  ['--font-size-label', '12 px', 'Plancher DEC-003 · Geist'],
  ['--font-size-body', '14 px', 'Corps'],
  ['--font-size-subtitle', '16 px', 'Sous-titre'],
  ['--font-size-title', '20 px', 'Titre de page'],
  ['--font-size-display', '28 px', 'Display login'],
];

const spaces = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8'];
const radii = ['--radius-sm', '--radius-md', '--radius-lg', '--radius-round'];
const motions = [
  ['--motion-fast', '150 ms', 'Contrôle, chevron'],
  ['--motion-bar', '240 ms', 'Barres de score'],
  ['--motion-ring', '320 ms', 'Anneau'],
];

const canonicalCodes = [
  ['DEMO-GE', 'GE-01'],
  ['DEMO-EAU', 'WILO-01'],
  ['DEMO-SSI', 'RIA-01'],
  ['DEMO-ASC-1', 'ASC-A1'],
  ['DEMO-ASC-2', 'ASC-A2'],
  ['DEMO-ASC-1/2', 'ASC-A1 · ASC-A2'],
  ['DEMO-ESP', 'IRR-01'],
  ['DEMO-RND', 'RND-LET'],
];

function Swatch({ token, note }: { token: string; note?: string }) {
  return (
    <figure className="ds-swatch">
      <i style={{ background: `var(${token})` }} />
      <figcaption>
        <code>{token}</code>
        {note ? <small>{note}</small> : null}
      </figcaption>
    </figure>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="ds-page">
      <header className="ds-hero">
        <div className="ds-brand">
          <span className="brand-mark">B</span>
          <span>BEHIRA<small>Système de design · hors navigation produit</small></span>
        </div>
        <Link href="/" className="ds-back">← Retour à l’application</Link>
      </header>

      <div className="ds-body">
        <p className="ds-lede">
          Socle sémantique du miroir, mis à jour le 16 septembre 2026 (clôture UI).
          Les valeurs ci-dessous sont celles de <code>:root</code>.
          Police Geist (DESIGN-003). Accent teal (DEC-013). Pas de thème sombre (DEC-006).
          CTA cockpit FM = « Ouvrir Dossiers ».
        </p>

        <section className="ds-section">
          <h1>Marque</h1>
          <div className="ds-grid">
            {brand.map(([token, note]) => <Swatch key={token} token={token} note={note} />)}
          </div>
        </section>

        <section className="ds-section">
          <h2>Chrome — bandeau navy</h2>
          <p className="ds-hint">Une seule bande navy. Libellés affichés par rôle ; matrice <code>allowedViewsByPersona</code> inchangée.</p>
          <div className="ds-chrome-demo" aria-hidden="true">
            <span className="brand-mark">B</span>
            <b>Accueil</b>
            <span>Dossiers</span>
            <span>Rondes</span>
            <span>Équipements</span>
            <span>Pilotage</span>
            <span>Plus</span>
            <em>Facility Manager</em>
          </div>
          <div className="ds-chrome-demo" aria-hidden="true" style={{ marginTop: 10 }}>
            <span className="brand-mark">B</span>
            <b>Arbitrages</b>
            <span>Dossiers</span>
            <span>Équipements</span>
            <span>Pilotage</span>
            <span>Paramètres</span>
            <em>Administration</em>
          </div>
          <div className="ds-grid ds-grid-chrome">
            {chrome.map(([token, note]) => <Swatch key={token} token={token} note={note} />)}
          </div>
        </section>

        <section className="ds-section">
          <h2>Navigation par rôle</h2>
          <p className="ds-hint">Registre et Coûts redirigent vers Dossiers. Utilisateurs (Administration) redirige vers Paramètres. Libellés mobiles non tronqués (Équipements, Paramètres).</p>
          <table className="ds-matrix">
            <thead>
              <tr>
                <th>Rôle</th>
                <th>Entrées visibles</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Facility Manager</td>
                <td>Accueil · Dossiers · Rondes · Équipements · Pilotage · Plus</td>
              </tr>
              <tr>
                <td>Administration</td>
                <td>Arbitrages · Dossiers · Équipements · Pilotage · Paramètres</td>
              </tr>
              <tr>
                <td>Agents</td>
                <td>Accueil · Rondes</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="ds-section">
          <h2>Codes canoniques</h2>
          <p className="ds-hint">DEMO-* restent en source. Affichage via <code>displayAssetCode</code> / <code>displayAssetText</code>.</p>
          <table className="ds-matrix">
            <thead>
              <tr><th>Source</th><th>Affichage</th></tr>
            </thead>
            <tbody>
              {canonicalCodes.map(([from, to]) => (
                <tr key={from}><td><code>{from}</code></td><td>{to}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="ds-section">
          <h2>Surfaces</h2>
          <div className="ds-grid">
            {surfaces.map(([token, note]) => <Swatch key={token} token={token} note={note} />)}
          </div>
        </section>

        <section className="ds-section">
          <h2>Encres et contours</h2>
          <div className="ds-grid">
            {inks.map(([token, note]) => <Swatch key={token} token={token} note={note} />)}
          </div>
        </section>

        <section className="ds-section">
          <h2>Triplets sémantiques</h2>
          <p className="ds-hint">Surface / bordure / encre. L’encre seule porte le texte à 12 px (≥ 4,5:1). Le token de rôle sert aux barres et pastilles.</p>
          <div className="ds-triplets">
            {triplets.map(([role, label]) => (
              <article key={role} className="ds-triplet" style={{
                background: `var(--${role}-surface)`,
                borderColor: `var(--${role}-border)`,
                color: `var(--${role}-text)`,
              }}>
                <b>{label}</b>
                <code>--{role}-text</code>
                <small>sur --{role}-surface</small>
              </article>
            ))}
          </div>
          <div className="ds-badges">
            <Badge tone="critical">Critique</Badge>
            <Badge tone="high">Haute</Badge>
            <Badge tone="orange">Hors délégation</Badge>
            <Badge tone="blue">À qualifier</Badge>
            <Badge tone="success">Clôturée</Badge>
            <Badge tone="neutral">Consultation</Badge>
            <Badge tone="neutral">Hors score</Badge>
          </div>
        </section>

        <section className="ds-section">
          <h2>Rampe de score</h2>
          <p className="ds-hint">Une seule teinte, du foncé au clair, pour des parts d’un même total — jamais les couleurs d’état. Palier uniquement sur <code>score.final</code> entier.</p>
          <div className="ds-score">
            {['--score-part-1', '--score-part-2', '--score-part-3', '--score-part-4'].map((token, index) => (
              <i key={token} style={{ background: `var(${token})`, flex: 4 - index }} title={token} />
            ))}
          </div>
        </section>

        <section className="ds-section">
          <h2>Échelle typographique</h2>
          <ul className="ds-type">
            {typeScale.map(([token, size, note]) => (
              <li key={token}>
                <span style={{ fontSize: `var(${token})` }}>Pilotage du bâtiment</span>
                <code>{token}</code>
                <small>{size} · {note}</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="ds-section">
          <h2>Espace, rayon, mouvement</h2>
          <div className="ds-spaces">
            {spaces.map((token) => (
              <figure key={token}>
                <i style={{ width: `var(${token})` }} />
                <figcaption><code>{token}</code></figcaption>
              </figure>
            ))}
          </div>
          <div className="ds-radii">
            {radii.map((token) => (
              <figure key={token}>
                <i style={{ borderRadius: `var(${token})` }} />
                <figcaption><code>{token}</code></figcaption>
              </figure>
            ))}
          </div>
          <ul className="ds-motion">
            {motions.map(([token, value, note]) => (
              <li key={token}><code>{token}</code> {value} — {note}</li>
            ))}
          </ul>
        </section>

        <section className="ds-section">
          <h2>Primitives</h2>
          <p className="ds-hint">Button, IconButton, Badge, Field, Card — extraits dans <code>app/components/ui</code>. Exception clôturée : échéance de qualification = <code>datetime-local</code> natif, vide. CTA = Ouvrir Dossiers.</p>
          <div className="ds-controls">
            <Button>Ouvrir Dossiers</Button>
            <Button variant="secondary">Conserver en brouillon</Button>
            <Button>Qualifier et affecter</Button>
            <IconButton aria-label="Notifications">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2a3.4 3.4 0 0 0-3.4 3.4v1.1c0 .9-.3 1.8-.9 2.5l-.5.6c-.4.4-.2 1.2.4 1.2h9.8c.6 0 .8-.8.4-1.2l-.5-.6a4 4 0 0 1-.9-2.5V6.6A3.4 3.4 0 0 0 10 3.2Z"/><path d="M8.2 15.2a1.8 1.8 0 0 0 3.6 0"/></svg>
            </IconButton>
            <Field label="Échéance"><input type="datetime-local" /></Field>
          </div>
          <Card className="ds-card-demo">
            <CardHeader kicker="ACTION PRINCIPALE" title="Préparer la décision" description="Une action par zone de travail. Bouton à droite de la ligne." action={<Button variant="secondary">Qualifier</Button>} />
            <div className="ds-badges">
              <Badge tone="critical">En retard</Badge>
              <Badge tone="high">Haute</Badge>
              <Badge tone="orange">Hors délégation</Badge>
              <Badge tone="blue">À qualifier</Badge>
              <Badge tone="success">Clôturée</Badge>
              <Badge tone="neutral">Hors score</Badge>
            </div>
          </Card>
        </section>

        <SharedSpecimen />
      </div>
    </main>
  );
}
