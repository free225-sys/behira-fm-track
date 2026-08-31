-- Idempotent production reference seed derived from the V3 workbook.

-- Placeholder values such as 'À renseigner' are stored as NULL, never invented.

begin;

set local app.seed_mode = 'on';

insert into public.roles (code, label, description, is_active) values
  ('direction', 'Direction', 'Full oversight and cost/risk approval', true),
  ('facility_manager', 'Facility Manager', 'Operational qualification, assignment and closure', true),
  ('field_agent', 'Agent terrain', 'Reporting and assigned internal interventions', true),
  ('vendor', 'Prestataire', 'Référentiel entreprise uniquement — aucun compte ni accès direct à l’outil', false),
  ('read_only', 'Lecture seule', 'Read-only consultation', true)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.priority_definitions (code, label, rank, color_token, requires_direction_alert, is_critical) values
  ('CRITICAL', 'Critique', 1, 'red', true, true),
  ('URGENT', 'Urgent', 2, 'orange_red', true, false),
  ('PRIORITY', 'Prioritaire', 3, 'orange', false, false),
  ('NORMAL', 'Normal', 4, 'blue', false, false),
  ('LOW', 'Faible', 5, 'grey', false, false)
on conflict (code) do update set
  label = excluded.label,
  rank = excluded.rank,
  color_token = excluded.color_token,
  requires_direction_alert = excluded.requires_direction_alert,
  is_critical = excluded.is_critical;

insert into public.zones (code, level_label, macro_zone, label, zone_type, criticality, alias, data_status, source_system, source_row, source_notes) values
  ('SS-CHAUFFEURS-REPOS', 'Sous-sol', 'Locaux de service', 'Salle de repos chauffeurs', 'Local personnel', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!5', 'Local chauffeurs à intégrer aux rondes de propreté et constats. | Contrôle doublon: OK'),
  ('SS-TGBT-STAB', 'Sous-sol', 'Locaux techniques', 'Local TGBT & stabilisateur', 'Technique électrique', 'critical', 'Local TGBT + stabilisateur', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!6', 'Au sous-sol ; le local TGBT et le stabilisateur sont traités comme une même zone de contrôle critique. | Contrôle doublon: OK'),
  ('SS-PARKING', 'Sous-sol', 'Parking', 'Parking sous-sol', 'Parking / exploitation', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!7', 'Surveillance propreté, infiltration, sécurité et circulation. | Contrôle doublon: OK'),
  ('SS-SALLE-PRIERE', 'Sous-sol', 'Locaux de service', 'Salle de prière', 'Local personnel', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!8', 'Contrôle propreté et respect d’usage. | Contrôle doublon: OK'),
  ('SS-PETIT-MAGASIN', 'Sous-sol', 'Stockage', 'Petit magasin', 'Stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!9', 'Contrôle rangement, encombrement, sécurité. | Contrôle doublon: OK'),
  ('SS-MAG-STOCK-EST', 'Sous-sol', 'Stockage', 'Magasin de stockage Est', 'Stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!10', 'Contrôle rangement, humidité, propreté. | Contrôle doublon: OK'),
  ('SS-MAG-STOCK-OUEST', 'Sous-sol', 'Stockage', 'Magasin de stockage Ouest', 'Stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!11', 'Contrôle rangement, humidité, propreté. | Contrôle doublon: OK'),
  ('SS-RANG-ESC-EST', 'Sous-sol', 'Stockage', 'Rangement sous escaliers Est', 'Stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!12', 'Zone à surveiller contre encombrement et humidité. | Contrôle doublon: OK'),
  ('SS-RANG-ESC-OUEST', 'Sous-sol', 'Stockage', 'Rangement sous escaliers Ouest', 'Stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!13', 'Zone à surveiller contre encombrement et humidité. | Contrôle doublon: OK'),
  ('SS-LOCAL-IRR', 'Sous-sol', 'Locaux techniques', 'Local technique irrigation', 'Technique irrigation', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!14', 'Rain Bird, pompe, filtres, électrovannes. Local historique irrigation. | Contrôle doublon: OK'),
  ('CIRC-CAGE-ESC', 'Tous niveaux', 'Circulation', 'Cage d’escaliers', 'Circulation / sécurité', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!15', 'Contrôle propreté, éclairage, encombrement, sécurité. | Contrôle doublon: OK'),
  ('ASC-HALL', 'Tous niveaux', 'Ascenseurs', 'Ascenseurs - Hall', 'Circulation verticale', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!16', 'Hall ascenseurs à contrôler par niveau. | Contrôle doublon: OK'),
  ('ASC-SAS', 'Tous niveaux', 'Ascenseurs', 'Ascenseurs - Sas', 'Circulation verticale', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!17', 'Sas ascenseurs à contrôler par niveau. | Contrôle doublon: OK'),
  ('ASC-A1-CABINE', 'Tous niveaux', 'Ascenseurs', 'Cabine ascenseur A1', 'Équipement / circulation verticale', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!18', 'Disponibilité, portes, interphone, propreté, anomalies. | Contrôle doublon: OK'),
  ('ASC-A2-CABINE', 'Tous niveaux', 'Ascenseurs', 'Cabine ascenseur A2', 'Équipement / circulation verticale', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!19', 'Disponibilité, portes, interphone, propreté, anomalies. | Contrôle doublon: OK'),
  ('TOIT-GEN', 'Toiture', 'Toiture', 'Toiture générale', 'Enveloppe bâtiment', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!20', 'Surveillance infiltrations, évacuations EP, sécurité. | Contrôle doublon: OK'),
  ('TOIT-ATRIUM', 'Toiture', 'Enveloppe', 'Couverture / toiture atrium', 'Enveloppe bâtiment', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!21', 'Infiltrations sous observation historique. | Contrôle doublon: OK'),
  ('ETG-01-STANBIC', '1er étage', 'Locataire / bureaux', 'Stanbic', 'Locataire / bureaux', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!22', 'Zone locataire à suivre avec sensibilité exploitation. | Contrôle doublon: OK'),
  ('ETG-02-PASSERELLE', '2e étage', 'Circulation / passerelle', 'Passerelle', 'Circulation / liaison', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!23', 'Contrôle propreté, infiltration, garde-corps, éclairage. | Contrôle doublon: OK'),
  ('ETG-03-TOTALENERGIES', '3e étage', 'Locataire / bureaux', 'TotalEnergies', 'Locataire / bureaux', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!24', 'Zone locataire sensible. | Contrôle doublon: OK'),
  ('ETG-04-ARCHIVES', '4e étage', 'Archives', 'Archives', 'Archives / stockage', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!25', 'Contrôle rangement, humidité, climatisation, sécurité incendie. | Contrôle doublon: OK'),
  ('RDC-HALL-ENTREE', 'RDC', 'Parties communes', 'Hall d’entrée', 'Accueil / parties communes', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!26', 'Zone image de l’immeuble, propreté et sûreté. | Contrôle doublon: OK'),
  ('RDC-RECEPTION-BEHIRA', 'RDC', 'Réception', 'Reception - Behira', 'Accueil', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!27', 'Accueil Behira. | Contrôle doublon: OK'),
  ('RDC-RECEPTION-TOTAL', 'RDC', 'Réception', 'Reception - TotalEnergies', 'Accueil locataire', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!28', 'Accueil TotalEnergies. | Contrôle doublon: OK'),
  ('RDC-JARD-LOCAL-TECH', 'RDC', 'Jardinières / irrigation', 'Jardinier - local technique', 'Local technique / espaces verts', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!29', 'À confirmer physiquement : zone jardinières / local technique RDC. | Contrôle doublon: OK'),
  ('RDC-ATRIUM-EST', 'RDC', 'Atrium', 'Atrium - Est', 'Atrium / parties communes', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!30', 'Contrôle propreté, infiltration, jardinières. | Contrôle doublon: OK'),
  ('RDC-ATRIUM-OUEST', 'RDC', 'Atrium', 'Atrium - Ouest', 'Atrium / parties communes', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!31', 'Contrôle propreté, infiltration, jardinières. | Contrôle doublon: OK'),
  ('RDC-ATRIUM-JARD-EST', 'RDC', 'Atrium / jardinières', 'Atrium jardinière Est', 'Zone terminale irrigation', 'priority', 'Atrium jardinière Est', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!32', 'Contrôle humidité, fuite, goutteurs, état plantes. | Contrôle doublon: OK'),
  ('RDC-ATRIUM-JARD-OUEST', 'RDC', 'Atrium / jardinières', 'Atrium jardinière Ouest', 'Zone terminale irrigation', 'priority', 'Atrium jardinière Ouest', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!33', 'Contrôle humidité, fuite, goutteurs, état plantes. | Contrôle doublon: OK'),
  ('CBX-ZONE-CAFE', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Zone Café', 'Bureaux / détente', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!34', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-SALLE-CONF', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Salle de conférence', 'Bureaux / réunion', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!35', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-LOCAL-ELEC', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Local électrique', 'Technique électrique', 'priority', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!36', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-BUREAU-AMANY', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Bureau M. Amany', 'Bureau direction', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!37', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-SALLE-REUNION', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Salle de réunion', 'Bureaux / réunion', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!38', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-OPEN-BEHIRA', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Open Space Behira', 'Bureaux', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!39', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-OPEN-CBRE', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Open Space CBRE', 'Bureaux', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!40', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('CBX-REPRO', 'RDC', 'CBX Office / Groupe BEHIRA', 'CBX Office - Reprographie Area', 'Bureaux / reprographie', 'normal', 'RDC - CBX Office / Groupe BEHIRA', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!41', 'CBX situé au RDC, dans les mêmes espaces que Groupe BEHIRA. | Contrôle doublon: OK'),
  ('EXT-CTY-DEPOSE', 'Extérieur', 'Courtyard', 'Courtyard - Dépose-minute', 'Accès / circulation', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!42', 'Flux véhicules, sécurité, éclairage. | Contrôle doublon: OK'),
  ('EXT-CTY-LOCAL-GE', 'Extérieur', 'Courtyard', 'Courtyard - Local groupe électrogène', 'Technique électrique', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!43', 'Local groupe électrogène extérieur/courtyard. | Contrôle doublon: OK'),
  ('EXT-CTY-LIVR', 'Extérieur', 'Courtyard', 'Courtyard - Zone de livraison', 'Logistique', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!44', 'Suivi flux livraison, propreté, sécurité. | Contrôle doublon: OK'),
  ('EXT-CTY-COURRIER-1', 'Extérieur', 'Courtyard', 'Courtyard - Local courrier 1', 'Service / courrier', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!45', 'Contrôle propreté, fermeture, humidité. | Contrôle doublon: OK'),
  ('EXT-CTY-COURRIER-2', 'Extérieur', 'Courtyard', 'Courtyard - Local courrier 2', 'Service / courrier', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!46', 'Contrôle propreté, fermeture, humidité. | Contrôle doublon: OK'),
  ('EXT-CTY-PARKING', 'Extérieur', 'Courtyard', 'Courtyard - Places de parking', 'Parking extérieur', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!47', 'Gestion stationnement et éclairage. | Contrôle doublon: OK'),
  ('EXT-CTY-LOCAL-POMPES', 'Extérieur', 'Courtyard', 'Courtyard - Local pompes', 'Technique eau / incendie', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!48', 'Local pompes à préciser selon équipements présents. | Contrôle doublon: OK'),
  ('EXT-ACC-GUERITE-PR', 'Extérieur', 'Accès / sûreté', 'Guérite principale extérieure', 'Sûreté / accès', 'priority', 'Courtyard - Guérite / Guérite principale extérieure', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!49', 'Remplace le libellé générique Courtyard - Guérite. | Contrôle doublon: OK'),
  ('EXT-ACC-GUERITE-SE', 'Extérieur', 'Accès / sûreté', 'Guérite secondaire extérieure', 'Sûreté / accès', 'normal', 'Guérite secondaire extérieure', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!50', 'Guérite secondaire à intégrer aux rondes. | Contrôle doublon: OK'),
  ('EXT-SEC-POSTE', 'Extérieur', 'Accès / sûreté', 'Courtyard - Poste de sécurité', 'Sûreté / accès', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!51', 'Poste sécurité, consignes, registre visiteurs. | Contrôle doublon: OK'),
  ('EXT-CTY-LOCAL-POUB', 'Extérieur', 'Courtyard', 'Courtyard - Local poubelle', 'Déchets / propreté', 'normal', 'Local poubelle extérieur', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!52', 'Zone déchets extérieure. | Contrôle doublon: OK'),
  ('EXT-CTY-WC-VIS-H', 'Extérieur', 'Courtyard', 'Courtyard - Toilettes visiteurs hommes', 'Sanitaires visiteurs', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!53', 'Contrôle propreté, fuite, consommables. | Contrôle doublon: OK'),
  ('EXT-CTY-WC-VIS-F', 'Extérieur', 'Courtyard', 'Courtyard - Toilettes visiteurs femmes', 'Sanitaires visiteurs', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!54', 'Contrôle propreté, fuite, consommables. | Contrôle doublon: OK'),
  ('EXT-CTY-SOUS-CPT-EAU', 'Extérieur', 'Courtyard', 'Courtyard - Local sous-compteurs d’eau', 'Technique eau', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!55', 'Relevés et anomalies sous-compteurs. | Contrôle doublon: OK'),
  ('EXT-NICHE-CIE', 'Extérieur', 'Réseaux concessionnaires', 'Exterior - Niche CIE', 'Réseau électrique', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!56', 'Point sensible alimentation électrique. | Contrôle doublon: OK'),
  ('EXT-LOCAL-TRANSFO', 'Extérieur', 'Réseaux concessionnaires', 'Exterior - Local transformateur', 'Réseau électrique', 'critical', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!57', 'Local transformateur extérieur. | Contrôle doublon: OK'),
  ('EXT-NICHE-SODECI', 'Extérieur', 'Réseaux concessionnaires', 'Exterior - Niche SODECI', 'Réseau eau', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!58', 'Point arrivée eau / compteur principal. | Contrôle doublon: OK'),
  ('RDC-KIT-PREP-FROIDE', 'RDC', 'Kitchen', 'Kitchen - Préparation froide', 'Cuisine', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!59', 'Zone cuisine froide. | Contrôle doublon: OK'),
  ('RDC-KIT-CHAMBRE-FROIDE', 'RDC', 'Kitchen', 'Kitchen - Chambre froide', 'Cuisine / froid', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!60', 'Chambre froide, joints, température, évacuation. | Contrôle doublon: OK'),
  ('RDC-KIT-PLONGE', 'RDC', 'Kitchen', 'Kitchen - Plonge', 'Cuisine / plomberie', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!61', 'Risque fuite et hygiène. | Contrôle doublon: OK'),
  ('RDC-KIT-PREP-CHAUDE', 'RDC', 'Kitchen', 'Kitchen - Préparation chaude', 'Cuisine', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!62', 'Zone cuisson/préparation chaude. | Contrôle doublon: OK'),
  ('RDC-REST-PMR', 'RDC', 'Restaurant', 'Restaurant - Toilettes PMR', 'Sanitaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!63', 'Contrôle accessibilité, propreté, fuite. | Contrôle doublon: OK'),
  ('RDC-REST-VEST-H', 'RDC', 'Restaurant', 'Restaurant - Vestiaires hommes', 'Vestiaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!64', 'Contrôle vestiaires. | Contrôle doublon: OK'),
  ('RDC-REST-VEST-F', 'RDC', 'Restaurant', 'Restaurant - Vestiaires femmes', 'Vestiaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!65', 'Contrôle vestiaires. | Contrôle doublon: OK'),
  ('RDC-REST-LOUNGE-BAR', 'RDC', 'Restaurant', 'Restaurant - Lounge & Bar', 'Restaurant / salle', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!66', 'Zone image et exploitation restaurant. | Contrôle doublon: OK'),
  ('RDC-REST-WC-H', 'RDC', 'Restaurant', 'Restaurant - Toilettes hommes', 'Sanitaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!67', 'Contrôle propreté, fuite, consommables. | Contrôle doublon: OK'),
  ('RDC-REST-BUREAU-ANN', 'RDC', 'Restaurant', 'Restaurant - Bureau annexe', 'Bureau restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!68', 'Contrôle bureau annexe. | Contrôle doublon: OK'),
  ('RDC-REST-TOILETTES-GEN', 'RDC', 'Restaurant', 'Restaurant - Toilettes', 'Sanitaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!69', 'Libellé général conservé ; vérifier s’il se distingue des WC hommes/femmes/PMR. | Contrôle doublon: OK'),
  ('RDC-REST-SUSHI', 'RDC', 'Restaurant', 'Restaurant - Sushi Bar', 'Restaurant / cuisine ouverte', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!70', 'Hygiène, eau, électricité, ventilation. | Contrôle doublon: OK'),
  ('RDC-REST-TEPPAN', 'RDC', 'Restaurant', 'Restaurant - Teppan Yaki', 'Restaurant / cuisine ouverte', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!71', 'Hygiène, extraction, sécurité. | Contrôle doublon: OK'),
  ('RDC-REST-TERRASSE', 'RDC', 'Restaurant', 'Restaurant - Terrasse', 'Terrasse / extérieur couvert', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!72', 'Contrôle propreté, mobilier, infiltration, jardinières. | Contrôle doublon: OK'),
  ('RDC-REST-LOCAL-POUB', 'RDC', 'Restaurant', 'Restaurant - Local poubelles', 'Déchets / propreté', 'normal', 'Local poubelles restaurant', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!73', 'Zone déchets restaurant. | Contrôle doublon: OK'),
  ('RDC-REST-WC-F', 'RDC', 'Restaurant', 'Restaurant - Toilettes femmes', 'Sanitaires restaurant', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!74', 'Contrôle propreté, fuite, consommables. | Contrôle doublon: OK'),
  ('RDC-TOTAL-ESPACE-CLIENT', 'RDC', 'TotalEnergies', 'TotalEnergies - Espace clients', 'Accueil locataire', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!75', 'Zone client TotalEnergies. | Contrôle doublon: OK'),
  ('RDC-TOTAL-BOUTIQUE', 'RDC', 'TotalEnergies', 'TotalEnergies - Boutique', 'Boutique locataire', 'priority', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!76', 'Boutique TotalEnergies. | Contrôle doublon: OK'),
  ('FAC-NORD', 'Extérieur', 'Façades', 'Façade Nord', 'Enveloppe bâtiment', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!77', 'Inspection visuelle, infiltration, fissures. | Contrôle doublon: OK'),
  ('FAC-SUD', 'Extérieur', 'Façades', 'Façade Sud', 'Enveloppe bâtiment', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!78', 'Inspection visuelle, infiltration, fissures. | Contrôle doublon: OK'),
  ('FAC-EST', 'Extérieur', 'Façades', 'Façade Est', 'Enveloppe bâtiment', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!79', 'Inspection visuelle, infiltration, fissures. | Contrôle doublon: OK'),
  ('FAC-OUEST', 'Extérieur', 'Façades', 'Façade Ouest', 'Enveloppe bâtiment', 'normal', null, 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '02_Zones!80', 'Inspection visuelle, infiltration, fissures. | Contrôle doublon: OK')
on conflict (code) do update set
  level_label = excluded.level_label,
  macro_zone = excluded.macro_zone,
  label = excluded.label,
  zone_type = excluded.zone_type,
  criticality = excluded.criticality,
  alias = excluded.alias,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.vendors (code, legal_name, vendor_type, family, operational_alias, status, data_status, source_system, source_row, source_notes) values
  ('ALTA-VENTURE', 'ALTAVENTURE CONSTRUCTION', 'Fournisseur', 'Travaux divers', 'ALTA VENTURE', 'active', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '04_Prestataires!9', 'IRR-01, jardinières, espaces verts, irrigation | Prestataire actuel espaces verts / irrigation. Alias opérationnel : ALTA VENTURE. | Statut source: Actif'),
  ('ARIC', 'ARIC', 'Fournisseur', 'Climatisation', null, 'to_integrate', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '04_Prestataires!11', 'CVC-01, climatisation, ventilation, chambre froide | Lot climatisation / ventilation. | Statut source: À intégrer'),
  ('ATA-CI', 'ATA-CI', 'Fournisseur', 'Ascenseurs', 'ATA CI / ALBEDO', 'active', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '04_Prestataires!13', 'ASC-A1, ASC-A2 | Prestataire ascenseurs. Alias historique : ATA CI / ALBEDO. | Statut source: Actif'),
  ('DMC', 'DM COMPANY', 'Fournisseur', 'Électricité', null, 'active', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '04_Prestataires!24', 'GE-01, TGBT, stabilisateur, locaux électriques | Code système conservé : DMC. Code tiers source : DM COMPANY. | Statut source: Actif'),
  ('SECURISYS', 'SECURISYS', 'Fournisseur', 'Sécurité', null, 'active', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '04_Prestataires!49', 'RIA-01, sécurité incendie, contrôles trimestriels | Prestataire sécurité incendie. | Statut source: Actif')
on conflict (code) do update set
  legal_name = excluded.legal_name,
  vendor_type = excluded.vendor_type,
  family = excluded.family,
  operational_alias = excluded.operational_alias,
  status = excluded.status,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.categories (code, family, label, default_priority_id, proof_policy, data_status, source_system, source_row, source_notes) values
  ('ELEC', 'Électricité', 'Anomalie électrique', (select id from public.priority_definitions where code = 'PRIORITY'), 'critical_only', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!5', 'Batterie faible, coffret humide, ATS, stabilisateur, câble | DMC si dépasse compétence interne.'),
  ('EAU', 'Eau / plomberie', 'Anomalie eau / plomberie', (select id from public.priority_definitions where code = 'PRIORITY'), 'conditional', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!6', 'Fuite, pression basse, vanne bloquée, nourrice | Peut déclencher plombier.'),
  ('INC', 'Sécurité incendie', 'Anomalie incendie / RIA', (select id from public.priority_definitions where code = 'CRITICAL'), 'always', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!7', 'Pompe en défaut, pression critique, vanne fermée | SECURISYS si critique.'),
  ('ASC', 'Ascenseur', 'Anomalie ascenseur', (select id from public.priority_definitions where code = 'CRITICAL'), 'always', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!8', 'Panne, porte, interphone, personne bloquée | ATA obligatoire selon gravité.'),
  ('IRR', 'Irrigation', 'Anomalie irrigation', (select id from public.priority_definitions where code = 'NORMAL'), 'critical_only', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!9', 'Zone sèche, fuite, pompe, électrovanne, Rain Bird | ALTA VENTURE en intervention.'),
  ('INF', 'Infiltration', 'Infiltration / pluie', (select id from public.priority_definitions where code = 'PRIORITY'), 'always', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!10', 'Gouttière, atrium, façade, toiture, eau au sol | Module spécifique saison pluie.'),
  ('NET', 'Nettoyage', 'Propreté / hygiène', (select id from public.priority_definitions where code = 'NORMAL'), 'conditional', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!11', 'Zone sale, poubelle, odeur, sanitaires | Peut rester en correction interne.'),
  ('ESP', 'Espaces verts', 'Plantes / jardinières', (select id from public.priority_definitions where code = 'NORMAL'), 'always', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!12', 'Plante sèche, substrat, terre visible | ALTA VENTURE si répétitif.'),
  ('SEC', 'Sûreté', 'Sûreté / accès / sécurité site', (select id from public.priority_definitions where code = 'PRIORITY'), 'conditional', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!13', 'Guérite, éclairage, portail, caméra | Lien avec sécurité/G4S.'),
  ('CVC', 'Climatisation', 'Climatisation / ventilation', (select id from public.priority_definitions where code = 'PRIORITY'), 'conditional', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!14', 'Fuite condensat, panne unité, bruit | ARIC selon dossier.'),
  ('DOC', 'Document', 'Document manquant', (select id from public.priority_definitions where code = 'NORMAL'), 'never', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!15', 'PV, rapport, fiche technique, plan de recollement | À relancer prestataire.'),
  ('COUT', 'Coût / budget', 'Coût à valider', (select id from public.priority_definitions where code = 'NORMAL'), 'always', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '05_Categories!16', 'Devis, bon de commande, bon à payer | Déclenche validation direction selon seuil.')
on conflict (code) do update set
  family = excluded.family,
  label = excluded.label,
  default_priority_id = excluded.default_priority_id,
  proof_policy = excluded.proof_policy,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.equipment (code, family, name, location_label, default_priority_id, control_frequency, health_status, health_score, lifecycle_scope, data_status, source_system, source_row, source_notes) values
  ('GE-01', 'Énergie', 'Groupe électrogène ELCOS', 'Local groupe électrogène', (select id from public.priority_definitions where code = 'CRITICAL'), 'Journalier / Hebdomadaire / Mensuel', 'À surveiller', 75, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!5', 'Sous-sol / local GE | Contrôle interne quotidien/hebdomadaire + DMC mensuel. | Reporting GE V2, rapports DMC'),
  ('WILO-01', 'Eau / plomberie', 'Surpresseur Wilo Smart Control', 'Local suppresseur / bâche à eau', (select id from public.priority_definitions where code = 'CRITICAL'), 'Journalier + incident', 'À surveiller', 70, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!6', 'Sous-sol / local Wilo | Suivre pression, P1/P2, redondance et réarmements. | Reporting Wilo V2'),
  ('RIA-01', 'Sécurité incendie', 'Pompe incendie / réseau RIA', 'Local pompe incendie', (select id from public.priority_definitions where code = 'CRITICAL'), 'Journalier + trimestriel', 'Bon', 85, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!7', 'Sous-sol / local RIA | Équipement de sécurité : preuve obligatoire en cas de critique. | Reporting RIA V2, rapports SECURISYS'),
  ('ASC-A1', 'Ascenseur', 'Ascenseur Mitsubishi MRL A1', 'Gaine / cabine A1', (select id from public.priority_definitions where code = 'CRITICAL'), 'Journalier + intervention ATA', 'À surveiller', 75, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!8', 'R-1 à R+4 | Suivi disponibilité A1 et redondance duplex. | Reporting Ascenseurs V2, rapports ATA'),
  ('ASC-A2', 'Ascenseur', 'Ascenseur Mitsubishi MRL A2', 'Gaine / cabine A2', (select id from public.priority_definitions where code = 'CRITICAL'), 'Journalier + intervention ATA', 'À surveiller', 75, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!9', 'R-1 à R+4 | Suivi disponibilité A2 et redondance duplex. | Reporting Ascenseurs V2, rapports ATA'),
  ('IRR-01', 'Irrigation / espaces verts', 'Système irrigation jardinières', 'Local technique irrigation + jardinières', (select id from public.priority_definitions where code = 'PRIORITY'), 'Journalier / Hebdomadaire', 'À surveiller', 70, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!10', 'RDC, Atriums, Étages 1, 2, 4 | Prestataire courant : ALTA VENTURE. BOTANICA uniquement historique PV. | Reporting Irrigation V2'),
  ('RND-LET', 'Rondes / constats', 'Ronde nettoyage, plantes et constats Laetitia', 'Parties communes intérieures/extérieures', (select id from public.priority_definitions where code = 'PRIORITY'), 'Journalier + bimensuel', 'Bon', 80, 'mvp', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!11', 'Tous niveaux | Les constats sont qualifiés techniquement par Faustin. | Fichier rondes Laetitia à créer / raccorder'),
  ('INF-01', 'Infiltrations / pluie', 'Suivi infiltrations et saison des pluies', 'Toiture, atrium, façades, gouttières', (select id from public.priority_definitions where code = 'PRIORITY'), 'Après pluie / hebdomadaire en saison', 'À créer', 0, 'post_mvp', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!12', 'Zones sensibles pluie | À intégrer après MVP central. | Module infiltration à créer'),
  ('FAC-01', 'Façades / enveloppe', 'Suivi façades et enveloppe bâtiment', 'Façades Nord, Sud, Est, Ouest', (select id from public.priority_definitions where code = 'NORMAL'), 'Mensuel / après incident', 'À créer', 0, 'post_mvp', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!13', 'Extérieurs | À intégrer après registre anomalies. | Plans façades / photos'),
  ('CVC-01', 'Climatisation / ventilation', 'Climatisation et ventilation', 'Locaux techniques + zones locataires', (select id from public.priority_definitions where code = 'PRIORITY'), 'Mensuel / incident', 'À créer', 0, 'post_mvp', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!14', 'Tous niveaux | À intégrer après MVP. | PV ARIC, rapports maintenance'),
  ('SEC-01', 'Sûreté / sécurité', 'Sécurité site, guérite, accès, éclairage', 'Guérite, parking, accès, extérieurs', (select id from public.priority_definitions where code = 'NORMAL'), 'Journalier / mensuel', 'À créer', 0, 'phase_2', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '01_Equipements!15', 'Extérieurs / accès | À intégrer en phase 2. | Rapports sûreté / CBRE')
on conflict (code) do update set
  family = excluded.family,
  name = excluded.name,
  location_label = excluded.location_label,
  default_priority_id = excluded.default_priority_id,
  control_frequency = excluded.control_frequency,
  health_status = excluded.health_status,
  health_score = excluded.health_score,
  lifecycle_scope = excluded.lifecycle_scope,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.profiles (employee_code, display_name, job_title, domain_summary, account_status, data_status, source_system, source_row, source_notes) values
  ('FAU-FM', 'Faustin SIAPO', 'Facility Manager', 'Tous équipements', 'pending_invitation', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '03_Agents!5', 'Qualification / décision / clôture | Admin opérationnel | Pivot de qualification, arbitrage, suivi des anomalies, validation des clôtures.'),
  ('DIR-FRED', 'Frédéric AMANY', 'Gérant / Direction', 'Tous équipements et toutes zones', 'pending_invitation', 'confirmed', 'BEHIRA_Liste_utilisateurs_a_valider.xlsx', 'Utilisateurs', 'Direction / super utilisateur métier ; validation de la matrice nominative du 26 août 2026.'),
  ('EVAR-ELEC', 'Évariste DJE', 'Électricien', 'GE-01 · toutes zones autorisées', 'pending_invitation', 'confirmed', 'BEHIRA_Liste_utilisateurs_a_valider.xlsx', 'Utilisateurs', 'Agent terrain GE-01 ; dépôt interne de rapports prestataires autorisé nominativement.'),
  ('SYL-PLB', 'Sylvain DOUANE', 'Technicien eau / plomberie', 'WILO-01, RIA-01, IRR-01 · toutes zones autorisées', 'pending_invitation', 'confirmed', 'BEHIRA_Liste_utilisateurs_a_valider.xlsx', 'Utilisateurs', 'Agent terrain eau/incendie/irrigation ; dépôt interne de rapports prestataires autorisé nominativement.'),
  ('LET-RND', 'Laetitia ATTOH', 'Assistante / rondes', 'RND-LET · toutes zones autorisées', 'pending_invitation', 'confirmed', 'BEHIRA_Liste_utilisateurs_a_valider.xlsx', 'Utilisateurs', 'Agent terrain RND-LET ; aucun droit de dépôt de rapport prestataire.')
on conflict (employee_code) do update set
  display_name = excluded.display_name,
  job_title = excluded.job_title,
  domain_summary = excluded.domain_summary,
  account_status = excluded.account_status,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

do $$
begin
  begin
    delete from public.profiles
    where employee_code = 'LECTURE'
      and auth_user_id is null;
  exception when foreign_key_violation then
    update public.profiles
    set account_status = 'suspended', data_status = 'to_confirm'
    where employee_code = 'LECTURE';
  end;
end;
$$;

insert into public.workflow_stages (code, label, sequence_no) values
  ('CONSTAT', 'Constat', 10),
  ('QUALIFICATION', 'Qualification', 20),
  ('DECISION', 'Décision', 30),
  ('INTERVENTION', 'Intervention', 40),
  ('PREUVE', 'Preuve', 50),
  ('CLOTURE', 'Clôture', 60)
on conflict (code) do update set
  label = excluded.label,
  sequence_no = excluded.sequence_no;

insert into public.status_definitions (code, label, stage_id, description, is_initial, is_closed, requires_proof, sort_order, source_system, source_row) values
  ('NOUVEAU', 'Nouveau', (select id from public.workflow_stages where code = 'CONSTAT'), 'Constat créé mais non traité', true, false, false, 10, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!5'),
  ('A_QUALIFIER', 'À qualifier', (select id from public.workflow_stages where code = 'QUALIFICATION'), 'Anomalie en attente de qualification Faustin', false, false, false, 20, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!6'),
  ('FAUSSE_ALERTE', 'Fausse alerte', (select id from public.workflow_stages where code = 'CLOTURE'), 'Signalement non confirmé', false, true, false, 30, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!7'),
  ('SOUS_SURVEILLANCE', 'Sous surveillance', (select id from public.workflow_stages where code = 'DECISION'), 'Problème léger/intermittent', false, false, false, 40, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!8'),
  ('CORRECTION_INTERNE_SIMPLE', 'Correction interne simple', (select id from public.workflow_stages where code = 'DECISION'), 'Action rapide par agent', false, false, true, 50, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!9'),
  ('INTERVENTION_INTERNE_PLANIFIEE', 'Intervention interne planifiée', (select id from public.workflow_stages where code = 'INTERVENTION'), 'Évariste/Sylvain doit intervenir', false, false, true, 60, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!10'),
  ('INTERVENTION_PRESTATAIRE', 'Intervention prestataire', (select id from public.workflow_stages where code = 'INTERVENTION'), 'Prestataire externe demandé', false, false, true, 70, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!11'),
  ('URGENCE_IMMEDIATE', 'Urgence immédiate', (select id from public.workflow_stages where code = 'INTERVENTION'), 'Traitement sans attendre', false, false, true, 80, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!12'),
  ('EN_COURS', 'En cours', (select id from public.workflow_stages where code = 'INTERVENTION'), 'Action en cours', false, false, true, 90, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!13'),
  ('EN_ATTENTE_DEVIS', 'En attente devis', (select id from public.workflow_stages where code = 'DECISION'), 'Devis nécessaire', false, false, false, 100, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!14'),
  ('EN_ATTENTE_PREUVE', 'En attente preuve', (select id from public.workflow_stages where code = 'PREUVE'), 'Intervention faite mais preuve manquante', false, false, true, 110, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!15'),
  ('RESOLU', 'Résolu', (select id from public.workflow_stages where code = 'PREUVE'), 'Action faite, en attente validation', false, false, false, 120, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!16'),
  ('CLOTURE', 'Clôturé', (select id from public.workflow_stages where code = 'CLOTURE'), 'Dossier terminé et historisé', false, true, false, 130, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!17'),
  ('REFUS_CLOTURE', 'Refus clôture', (select id from public.workflow_stages where code = 'PREUVE'), 'Preuve insuffisante ou action incomplète', false, false, false, 140, 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '07_Statuts!18')
on conflict (code) do update set
  label = excluded.label,
  stage_id = excluded.stage_id,
  description = excluded.description,
  is_initial = excluded.is_initial,
  is_closed = excluded.is_closed,
  requires_proof = excluded.requires_proof,
  sort_order = excluded.sort_order,
  source_system = excluded.source_system,
  source_row = excluded.source_row;

-- C1 catalogue compatibility is seeded only after workflow stages exist.
-- Every next-action code remains inactive until the outstanding B2 catalogue
-- arbitration is explicitly approved; these rows therefore grant no workflow
-- capability and are currently visible only to Direction/FM for review.
insert into public.next_action_code_stages(action_code_id, workflow_stage_id, is_default_for_stage)
select c.id, s.id, false
from (
  values
    ('QUALIFY_ASSIGN', 'QUALIFICATION'),
    ('PERFORM_DIAGNOSIS', 'QUALIFICATION'),
    ('CHOOSE_TREATMENT_BRANCH', 'QUALIFICATION'),
    ('MONITOR_REASSESS', 'DECISION'),
    ('OBTAIN_QUOTE', 'DECISION'),
    ('SUBMIT_ADMIN_ARBITRATION', 'QUALIFICATION'),
    ('SUBMIT_ADMIN_ARBITRATION', 'DECISION'),
    ('PLAN_INTERVENTION', 'DECISION'),
    ('PLAN_INTERVENTION', 'INTERVENTION'),
    ('EXECUTE_INTERVENTION', 'INTERVENTION'),
    ('FOLLOW_UP_BLOCKER', 'CONSTAT'),
    ('FOLLOW_UP_BLOCKER', 'QUALIFICATION'),
    ('FOLLOW_UP_BLOCKER', 'DECISION'),
    ('FOLLOW_UP_BLOCKER', 'INTERVENTION'),
    ('FOLLOW_UP_BLOCKER', 'PREUVE'),
    ('RECEIVE_INTERVENTION', 'INTERVENTION'),
    ('RECEIVE_INTERVENTION', 'PREUVE'),
    ('LIFT_RESERVATIONS', 'PREUVE'),
    ('SUBMIT_REQUIRED_PROOF', 'INTERVENTION'),
    ('SUBMIT_REQUIRED_PROOF', 'PREUVE'),
    ('VALIDATE_PROOF', 'PREUVE'),
    ('CLOSE_DOSSIER', 'PREUVE'),
    ('REVIEW_REOPENED_DOSSIER', 'QUALIFICATION'),
    ('REVIEW_REOPENED_DOSSIER', 'INTERVENTION'),
    ('OTHER', 'CONSTAT'),
    ('OTHER', 'QUALIFICATION'),
    ('OTHER', 'DECISION'),
    ('OTHER', 'INTERVENTION'),
    ('OTHER', 'PREUVE')
) as mapping(action_code, stage_code)
join public.next_action_codes c on c.code = mapping.action_code
join public.workflow_stages s on s.code = mapping.stage_code
on conflict (action_code_id, workflow_stage_id) do update set
  is_default_for_stage = excluded.is_default_for_stage;

insert into public.status_transitions (from_status_id, to_status_id, requires_comment) values
  ((select id from public.status_definitions where code = 'NOUVEAU'), (select id from public.status_definitions where code = 'A_QUALIFIER'), false),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'FAUSSE_ALERTE'), true),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'SOUS_SURVEILLANCE'), true),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'CORRECTION_INTERNE_SIMPLE'), false),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'INTERVENTION_INTERNE_PLANIFIEE'), false),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'INTERVENTION_PRESTATAIRE'), false),
  ((select id from public.status_definitions where code = 'A_QUALIFIER'), (select id from public.status_definitions where code = 'URGENCE_IMMEDIATE'), false),
  ((select id from public.status_definitions where code = 'SOUS_SURVEILLANCE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'SOUS_SURVEILLANCE'), (select id from public.status_definitions where code = 'RESOLU'), false),
  ((select id from public.status_definitions where code = 'CORRECTION_INTERNE_SIMPLE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'CORRECTION_INTERNE_SIMPLE'), (select id from public.status_definitions where code = 'RESOLU'), false),
  ((select id from public.status_definitions where code = 'INTERVENTION_INTERNE_PLANIFIEE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'INTERVENTION_PRESTATAIRE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'URGENCE_IMMEDIATE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'INTERVENTION_PRESTATAIRE'), (select id from public.status_definitions where code = 'EN_ATTENTE_DEVIS'), false),
  ((select id from public.status_definitions where code = 'EN_ATTENTE_DEVIS'), (select id from public.status_definitions where code = 'INTERVENTION_PRESTATAIRE'), false),
  ((select id from public.status_definitions where code = 'EN_ATTENTE_DEVIS'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'EN_COURS'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), false),
  ((select id from public.status_definitions where code = 'EN_COURS'), (select id from public.status_definitions where code = 'RESOLU'), false),
  ((select id from public.status_definitions where code = 'RESOLU'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), false),
  ((select id from public.status_definitions where code = 'RESOLU'), (select id from public.status_definitions where code = 'CLOTURE'), false),
  ((select id from public.status_definitions where code = 'RESOLU'), (select id from public.status_definitions where code = 'REFUS_CLOTURE'), true),
  ((select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.status_definitions where code = 'CLOTURE'), false),
  ((select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.status_definitions where code = 'REFUS_CLOTURE'), true),
  ((select id from public.status_definitions where code = 'REFUS_CLOTURE'), (select id from public.status_definitions where code = 'EN_COURS'), false),
  ((select id from public.status_definitions where code = 'REFUS_CLOTURE'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), false)
on conflict do nothing;

insert into public.sla_rules (code, priority_id, qualification_minutes, internal_intervention_minutes, vendor_intervention_minutes, calendar_mode, source_system, source_row, source_notes) values
  ('SLA-CRITICAL', (select id from public.priority_definitions where code = 'CRITICAL'), 0, 0, 0, 'elapsed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '06_Priorites_SLA!5', 'Personne bloquée, RIA indisponible, GE non AUTO, fuite majeure active'),
  ('SLA-URGENT', (select id from public.priority_definitions where code = 'URGENT'), 240, 1440, 1440, 'elapsed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '06_Priorites_SLA!6', 'Perte de redondance, défaut ascenseur, pression eau instable'),
  ('SLA-PRIORITY', (select id from public.priority_definitions where code = 'PRIORITY'), 1440, 2880, 2880, 'elapsed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '06_Priorites_SLA!7', 'Anomalie technique répétée, zone sèche, fuite faible'),
  ('SLA-NORMAL', (select id from public.priority_definitions where code = 'NORMAL'), 2880, 10080, 10080, 'elapsed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '06_Priorites_SLA!8', 'Correction non bloquante, confort, réglage'),
  ('SLA-LOW', (select id from public.priority_definitions where code = 'LOW'), 4320, 20160, 20160, 'elapsed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '06_Priorites_SLA!9', 'Observation mineure, suivi visuel')
on conflict (code) do update set
  priority_id = excluded.priority_id,
  qualification_minutes = excluded.qualification_minutes,
  internal_intervention_minutes = excluded.internal_intervention_minutes,
  vendor_intervention_minutes = excluded.vendor_intervention_minutes,
  calendar_mode = excluded.calendar_mode,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.threshold_rules (code, equipment_id, parameter_name, unit, ok_expression, alert_expression, critical_expression, structured_rule, automatic_action, data_status, source_system, source_row, source_notes) values
  ('THR-GE-01-NIVEAU_CARBURANT', (select id from public.equipment where code = 'GE-01'), 'Niveau carburant', '%', '≥ 64', null, '< 64', '{}', 'Créer anomalie critique carburant', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!5', 'Seuil défini dans reporting GE.'),
  ('THR-GE-01-NIVEAU_HUILE', (select id from public.equipment where code = 'GE-01'), 'Niveau huile', '%', '≥ 90', null, '< 90', '{}', 'Créer anomalie critique huile', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!6', 'Jauge huile.'),
  ('THR-GE-01-TEMPERATURE_EAU', (select id from public.equipment where code = 'GE-01'), 'Température eau', '°C', '< 95', '95 à 100', '> 100', '{}', 'Alerter Évariste + Faustin', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!7', 'Surveillance thermique.'),
  ('THR-GE-01-TENSION_BATTERIE', (select id from public.equipment where code = 'GE-01'), 'Tension batterie', 'V', '> 25', '23 à 25', '< 23', '{}', 'Contrôle batterie / DMC', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!8', 'Batterie groupe.'),
  ('THR-GE-01-MODE_GE_ATS', (select id from public.equipment where code = 'GE-01'), 'Mode GE / ATS', 'Oui/Non', 'AUTO', null, 'Non AUTO', '{}', 'Alerte immédiate', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!9', 'Continuité service.'),
  ('THR-WILO-01-PRESSION_RESEAU', (select id from public.equipment where code = 'WILO-01'), 'Pression réseau', 'bar', 'Dans plage cible', 'Écart modéré', 'Très basse / très haute', '{}', 'Qualification Faustin', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!10', 'Plage précise à valider terrain.'),
  ('THR-WILO-01-REDONDANCE_P1_P2', (select id from public.equipment where code = 'WILO-01'), 'Redondance P1/P2', 'Oui/Non', 'P1 + P2 disponibles', 'Une pompe indisponible', 'P1 + P2 indisponibles', '{}', 'Intervention urgente', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!11', 'Perte redondance à suivre.'),
  ('THR-WILO-01-REARMEMENT_REPETE', (select id from public.equipment where code = 'WILO-01'), 'Réarmement répété', 'Nombre', '0 à 1', '2', '≥ 3 / 30 jours', '{}', 'Maintenance préventive recommandée', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!12', 'Récurrence.'),
  ('THR-RIA-01-PRESSION_INCENDIE', (select id from public.equipment where code = 'RIA-01'), 'Pression incendie', 'bar', 'Plage validée', 'Écart modéré', 'Pression critique', '{}', 'Alerte incendie immédiate', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!13', 'À caler avec SECURISYS.'),
  ('THR-RIA-01-COFFRET_GMP_ISG100', (select id from public.equipment where code = 'RIA-01'), 'Coffret GMP / ISG100', 'État', 'ON / normal', 'Défaut mémorisé', 'OFF / défaut actif', '{}', 'Alerte immédiate', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!14', 'Sécurité incendie.'),
  ('THR-RIA-01-VANNES_RESEAU', (select id from public.equipment where code = 'RIA-01'), 'Vannes réseau', 'État', 'Ouvertes', 'Position douteuse', 'Fermée', '{}', 'Alerte critique', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!15', 'Sécurité incendie.'),
  ('THR-ASC-A1-DISPONIBILITE_DUPLEX', (select id from public.equipment where code = 'ASC-A1'), 'Disponibilité duplex', 'État', 'A1 + A2 OK', 'Un seul ascenseur OK', 'A1 + A2 HS', '{}', 'Alerte ATA + Faustin', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!16', 'Impact locataires.'),
  ('THR-ASC-A2-DISPONIBILITE_DUPLEX', (select id from public.equipment where code = 'ASC-A2'), 'Disponibilité duplex', 'État', 'A1 + A2 OK', 'Un seul ascenseur OK', 'A1 + A2 HS', '{}', 'Alerte ATA + Faustin', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!16', 'Impact locataires.'),
  ('THR-ASC-A1-PERSONNE_BLOQUEE', (select id from public.equipment where code = 'ASC-A1'), 'Personne bloquée', 'Oui/Non', 'Non', null, 'Oui', '{}', 'Urgence immédiate', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!17', 'Critique absolu.'),
  ('THR-ASC-A2-PERSONNE_BLOQUEE', (select id from public.equipment where code = 'ASC-A2'), 'Personne bloquée', 'Oui/Non', 'Non', null, 'Oui', '{}', 'Urgence immédiate', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!17', 'Critique absolu.'),
  ('THR-ASC-A1-INTERPHONE_URGENCE', (select id from public.equipment where code = 'ASC-A1'), 'Interphone urgence', 'État', 'OK', null, 'HS', '{}', 'Alerte sécurité', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!18', 'Sécurité utilisateurs.'),
  ('THR-ASC-A2-INTERPHONE_URGENCE', (select id from public.equipment where code = 'ASC-A2'), 'Interphone urgence', 'État', 'OK', null, 'HS', '{}', 'Alerte sécurité', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!18', 'Sécurité utilisateurs.'),
  ('THR-IRR-01-PRESSION_IRRIGATION', (select id from public.equipment where code = 'IRR-01'), 'Pression irrigation', 'bar', '1.5 à 3.5', '0.5 à 1.5 ou >3.5', '< 0.5 / 0', '{}', 'Contrôle local irrigation', 'to_confirm', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!19', 'Seuils actuels à confirmer.'),
  ('THR-IRR-01-COFFRET_IRRIGATION', (select id from public.equipment where code = 'IRR-01'), 'Coffret irrigation', 'État', 'Sec', 'Condensation', 'Humide / eau', '{}', 'Alerte critique', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!20', 'Risque électrique.'),
  ('THR-IRR-01-ZONE_SECHE_REPETEE', (select id from public.equipment where code = 'IRR-01'), 'Zone sèche répétée', 'Nombre', '0 à 1', '2', '≥ 3 / 14 jours', '{}', 'Intervention ALTA VENTURE', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '08_Seuils!21', 'Récurrence zone.')
on conflict (code) do update set
  equipment_id = excluded.equipment_id,
  parameter_name = excluded.parameter_name,
  unit = excluded.unit,
  ok_expression = excluded.ok_expression,
  alert_expression = excluded.alert_expression,
  critical_expression = excluded.critical_expression,
  structured_rule = excluded.structured_rule,
  automatic_action = excluded.automatic_action,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row,
  source_notes = excluded.source_notes;

insert into public.notification_rules (code, trigger_event, severity, primary_role_code, copy_role_code, channels, delay_minutes, schedule_expression, message_template, expected_action, data_status, source_system, source_row) values
  ('NTF-RONDE_NON_FAITE', 'ronde_non_faite', 'Normal', 'field_agent', 'facility_manager', array['in_app','email']::text[], null, 'Jour même', 'Ronde non enregistrée pour {équipement}.', 'Saisir ou justifier.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!5'),
  ('NTF-AUCUNE_RONDE_EQUIPEMENT_CRITIQUE_DEPUIS_3_JOURS', 'aucune_ronde_equipement_critique_depuis_3_jours', 'Critique', 'facility_manager', 'direction', array['in_app','email']::text[], 0, null, 'Contrôle urgent : aucune ronde depuis 3 jours sur {équipement}.', 'Planifier contrôle.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!6'),
  ('NTF-ANOMALIE_NON_QUALIFIEE_SOUS_24_H', 'anomalie_non_qualifiee_sous_24_h', 'Prioritaire', 'facility_manager', null, array['in_app','email']::text[], 1440, null, 'Anomalie à qualifier : {référence}.', 'Qualifier et attribuer.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!7'),
  ('NTF-INTERVENTION_PREVUE_DANS_48_H', 'intervention_prevue_dans_48_h', 'Normal', 'field_agent', 'facility_manager', array['in_app']::text[], 2880, null, 'Intervention à préparer : {référence}.', 'Confirmer planning.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!8'),
  ('NTF-INTERVENTION_EN_RETARD', 'intervention_en_retard', 'Urgent', 'facility_manager', null, array['in_app','email']::text[], null, 'À échéance dépassée', 'Intervention en retard : {référence}.', 'Relancer / arbitrer.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!9'),
  ('NTF-PV_OU_PREUVE_NON_GENERE_APRES_INTERVENTION', 'pv_ou_preuve_non_genere_apres_intervention', 'Prioritaire', 'facility_manager', null, array['in_app']::text[], null, 'Après intervention', 'Preuve manquante pour clôture : {référence}.', 'Joindre photo / PV.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!10'),
  ('NTF-RESERVES_NON_LEVEES', 'reserves_non_levees', 'Prioritaire', 'facility_manager', 'direction', array['in_app','email']::text[], null, 'Selon échéance', 'Réserve non levée : {référence}.', 'Relancer le prestataire hors outil et consigner le retour.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!11'),
  ('NTF-3_ANOMALIES_M_ME_EQUIPEMENT_30_JOURS', '3_anomalies_m_me_equipement_30_jours', 'Intelligente', 'facility_manager', 'direction', array['in_app']::text[], null, 'Automatique', 'Maintenance préventive recommandée sur {équipement}.', 'Décider action préventive.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!12'),
  ('NTF-2_URGENCES_M_ME_ZONE_30_JOURS', '2_urgences_m_me_zone_30_jours', 'Intelligente', 'direction', 'facility_manager', array['in_app']::text[], null, 'Automatique', 'Audit technique recommandé sur {zone}.', 'Arbitrer audit.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!13'),
  ('NTF-CO_T_CUMULE_ELEVE', 'co_t_cumule_eleve', 'Intelligente', 'direction', 'facility_manager', array['in_app']::text[], null, 'Mensuel', 'Arbitrage remplacement recommandé sur {équipement}.', 'Comparer réparation/remplacement.', 'confirmed', 'BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx', '09_Notifications!14')
on conflict (code) do update set
  trigger_event = excluded.trigger_event,
  severity = excluded.severity,
  primary_role_code = excluded.primary_role_code,
  copy_role_code = excluded.copy_role_code,
  channels = excluded.channels,
  delay_minutes = excluded.delay_minutes,
  schedule_expression = excluded.schedule_expression,
  message_template = excluded.message_template,
  expected_action = excluded.expected_action,
  data_status = excluded.data_status,
  source_system = excluded.source_system,
  source_row = excluded.source_row;

insert into public.user_roles (profile_id, role_id, equipment_id) values
  ((select id from public.profiles where employee_code = 'FAU-FM'), (select id from public.roles where code = 'facility_manager'), null),
  ((select id from public.profiles where employee_code = 'DIR-FRED'), (select id from public.roles where code = 'direction'), null),
  ((select id from public.profiles where employee_code = 'EVAR-ELEC'), (select id from public.roles where code = 'field_agent'), null),
  ((select id from public.profiles where employee_code = 'SYL-PLB'), (select id from public.roles where code = 'field_agent'), null),
  ((select id from public.profiles where employee_code = 'LET-RND'), (select id from public.roles where code = 'field_agent'), null)
on conflict do nothing;

insert into public.user_roles (profile_id, role_id, equipment_id) values
  ((select id from public.profiles where employee_code = 'EVAR-ELEC'), (select id from public.roles where code = 'field_agent'), (select id from public.equipment where code = 'GE-01')),
  ((select id from public.profiles where employee_code = 'SYL-PLB'), (select id from public.roles where code = 'field_agent'), (select id from public.equipment where code = 'WILO-01')),
  ((select id from public.profiles where employee_code = 'SYL-PLB'), (select id from public.roles where code = 'field_agent'), (select id from public.equipment where code = 'RIA-01')),
  ((select id from public.profiles where employee_code = 'SYL-PLB'), (select id from public.roles where code = 'field_agent'), (select id from public.equipment where code = 'IRR-01')),
  ((select id from public.profiles where employee_code = 'LET-RND'), (select id from public.roles where code = 'field_agent'), (select id from public.equipment where code = 'RND-LET'))
on conflict do nothing;

delete from public.user_roles ur
using public.profiles p, public.equipment e
where ur.profile_id = p.id
  and ur.equipment_id = e.id
  and (
    (p.employee_code = 'EVAR-ELEC' and e.code <> 'GE-01')
    or (p.employee_code = 'SYL-PLB' and e.code not in ('WILO-01', 'RIA-01', 'IRR-01'))
    or (p.employee_code = 'LET-RND' and e.code <> 'RND-LET')
  );

update public.profile_permissions pp
set revoked_at = coalesce(pp.revoked_at, now()),
    reason = 'Permission retirée : hors matrice nominative validée le 26 août 2026.'
where pp.permission_code = 'upload_vendor_intervention_report'
  and pp.profile_id not in (
    select id from public.profiles where employee_code in ('EVAR-ELEC', 'SYL-PLB')
  )
  and pp.revoked_at is null;

insert into public.profile_permissions (
  profile_id, permission_code, granted_by_profile_id, valid_until, revoked_at, reason
)
select
  grantee.id,
  'upload_vendor_intervention_report',
  direction.id,
  null,
  null,
  case grantee.employee_code
    when 'EVAR-ELEC' then 'Matrice validée : dépôt interne de rapports prestataires, périmètre GE-01 uniquement.'
    when 'SYL-PLB' then 'Matrice validée : dépôt interne de rapports prestataires, périmètre WILO-01, RIA-01 et IRR-01 uniquement.'
  end
from public.profiles grantee
cross join public.profiles direction
where grantee.employee_code in ('EVAR-ELEC', 'SYL-PLB')
  and direction.employee_code = 'DIR-FRED'
on conflict (profile_id, permission_code) do update set
  granted_by_profile_id = excluded.granted_by_profile_id,
  valid_until = null,
  revoked_at = null,
  reason = excluded.reason;

insert into public.equipment_vendors (equipment_id, vendor_id, relation_type, is_primary) values
  ((select id from public.equipment where code = 'GE-01'), (select id from public.vendors where code = 'DMC'), 'maintainer', true),
  ((select id from public.equipment where code = 'RIA-01'), (select id from public.vendors where code = 'SECURISYS'), 'maintainer', true),
  ((select id from public.equipment where code = 'ASC-A1'), (select id from public.vendors where code = 'ATA-CI'), 'maintainer', true),
  ((select id from public.equipment where code = 'ASC-A2'), (select id from public.vendors where code = 'ATA-CI'), 'maintainer', true),
  ((select id from public.equipment where code = 'IRR-01'), (select id from public.vendors where code = 'ALTA-VENTURE'), 'maintainer', true),
  ((select id from public.equipment where code = 'CVC-01'), (select id from public.vendors where code = 'ARIC'), 'maintainer', true)
on conflict (equipment_id, vendor_id, relation_type) do update set
  is_primary = excluded.is_primary;

-- C11-B pilot registration. This row intentionally carries no criticality or
-- score: those values remain pending until Administration and Facility Manager
-- validate the business decisions documented for C11.
insert into public.equipment_score_assignments(
  equipment_id, formula_version_id, validation_status, source_notes
)
select e.id, f.id, 'pending',
       'Pilote C11-B WILO-01 ; criticité et activation en attente de validation métier.'
from public.equipment e
join public.equipment_score_formula_versions f
  on f.code = 'equipment_health' and f.version_no = 1
where e.code = 'WILO-01'
  and not exists (
    select 1 from public.equipment_score_assignments esa
    where esa.equipment_id = e.id and esa.effective_to is null
  );

commit;
