# Essai des migrations du 30/09/2026 sur l'environnement Docker local (Supabase), AVANT la preproduction.
# Usage (depuis le dossier du depot) :
#   powershell -ExecutionPolicy Bypass -File scripts\test-docker-claude-2026-09-30.ps1
# Etapes : controles, diagnostic des migrations anterieures non enregistrees, sauvegarde de la base Docker, application des 3 migrations (enregistrees dans
# supabase_migrations.schema_migrations comme le ferait la CLI), tests SQL 002, 015, 016, 017.
# Les tests s'executent dans des transactions annulees : ils ne laissent aucune donnee.
# Journal : ..\..\outputs\test-docker-claude-2026-09-30.log (dossier outputs du projet).
# Compatible Windows PowerShell 5.1 (fichier UTF-8 avec BOM, sorties natives non bloquantes).
$ErrorActionPreference = 'Continue'
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Outputs = Join-Path $Root '..\..\outputs'
if (-not (Test-Path $Outputs)) { New-Item -ItemType Directory -Path $Outputs | Out-Null }
$Log = Join-Path (Resolve-Path $Outputs).Path 'test-docker-claude-2026-09-30.log'
$Docker = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (-not $Docker) { $Docker = 'C:\Users\HP PC\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe' }
$Container = 'supabase_db_behira-fm-track'
$Dump = '/tmp/avant-claude-2026-09-30.dump'

function Write-Log([string]$text) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $text"
  Write-Host $line
  Add-Content -LiteralPath $Log -Value $line -Encoding UTF8
}
function Invoke-Psql([string]$sql, [switch]$Quiet) {
  $output = $sql | & $Docker exec -i $Container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -At 2>&1 | ForEach-Object { "$_" }
  $script:PsqlOutput = ($output -join "`n")
  if (-not $Quiet) { Add-Content -LiteralPath $Log -Value $script:PsqlOutput -Encoding UTF8 }
  return $LASTEXITCODE
}
function Invoke-SqlFile([string]$path) {
  return Invoke-Psql (Get-Content -Raw -Encoding UTF8 -LiteralPath $path)
}

Set-Content -LiteralPath $Log -Value 'Essai Docker - lot Claude du 30/09/2026' -Encoding UTF8
Write-Log "Depot : $Root"

# 1. Docker et conteneur
$names = & $Docker ps --filter "name=$Container" --format '{{.Names}}' 2>&1 | ForEach-Object { "$_" }
if ($LASTEXITCODE -ne 0) { Write-Log "ECHEC : Docker Desktop ne repond pas ($names). Demarrez Docker Desktop puis relancez."; exit 1 }
if (-not ($names -contains $Container)) { Write-Log "ECHEC : le conteneur $Container n'est pas demarre. Lancez la pile Supabase locale puis relancez."; exit 1 }

# 2. Etat des migrations : toutes les migrations anterieures doivent deja etre appliquees
$Mine = @('20260930150000','20260930160000','20260930170000','20260930180000','20260930190000')
if ((Invoke-Psql 'select version from supabase_migrations.schema_migrations order by 1;' -Quiet) -ne 0) { Write-Log "ECHEC : lecture de l'historique des migrations impossible : $script:PsqlOutput"; exit 1 }
$Applied = $script:PsqlOutput -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^\d{14}$' }
$Files = Get-ChildItem -LiteralPath (Join-Path $Root 'supabase\migrations') -Filter '*.sql' | Sort-Object Name
$Pending = @($Files | Where-Object { ($_.Name.Substring(0,14) -notin $Applied) -and ($_.Name.Substring(0,14) -notin $Mine) } | ForEach-Object { $_.Name })
# Migrations anterieures non enregistrees : Codex les a parfois appliquees directement avec psql.
# Diagnostic en lecture seule des objets reellement presents, migration par migration.
$Plan = @()
if ($Pending.Count -gt 0) {
  Write-Log "$($Pending.Count) migration(s) anterieure(s) absentes de l'historique : diagnostic des objets presents..."
  if ((Invoke-SqlFile (Join-Path $Root 'scripts\diag-migrations-2026-09-21-28.sql')) -ne 0) { Write-Log 'ECHEC : diagnostic impossible (detail dans le journal).'; exit 1 }
  $Rows = $script:PsqlOutput -split "`n" | Where-Object { $_ -match '^\d{14}_.*\|.*\|(OK|ABSENT|DIFFERENT|INDETERMINE)$' } | ForEach-Object { $c = $_.Split('|'); [pscustomobject]@{ M = $c[0]; O = $c[1]; S = $c[2] } }
  $Blocked = $false
  foreach ($p in $Pending) {
    $r = @($Rows | Where-Object { $_.M -eq $p -and $_.S -ne 'INDETERMINE' })
    $ok = @($r | Where-Object { $_.S -eq 'OK' }).Count
    if ($r.Count -eq 0) { Write-Log "  $p : non couverte par le diagnostic"; $Blocked = $true }
    elseif ($ok -eq $r.Count) { Write-Log "  $p : deja presente (sera seulement enregistree)"; $Plan += [pscustomobject]@{ Name = $p; Action = 'record' } }
    elseif ($ok -eq 0) { Write-Log "  $p : absente (sera appliquee)"; $Plan += [pscustomobject]@{ Name = $p; Action = 'apply' } }
    else { Write-Log "  $p : PARTIELLE ($ok/$($r.Count) objets conformes)"; $r | Where-Object { $_.S -ne 'OK' } | ForEach-Object { Write-Log "      $($_.S) : $($_.O)" }; $Blocked = $true }
  }
  if ($Blocked) { Write-Log 'ARRET : etat partiel ou inconnu, rien n''a ete modifie. Envoyez ce journal a Claude.'; exit 1 }
}
$AlreadyMine = @($Mine | Where-Object { $_ -in $Applied })
if ($AlreadyMine.Count -gt 0) { Write-Log "Deja appliquees (ignorees) : $($AlreadyMine -join ', ')" }

# 3. Sauvegarde
Write-Log "Sauvegarde de la base Docker (dans le conteneur : $Dump)"
& $Docker exec $Container pg_dump -U postgres -d postgres -Fc -f $Dump 2>&1 | ForEach-Object { Add-Content -LiteralPath $Log -Value "$_" -Encoding UTF8 }
if ($LASTEXITCODE -ne 0) { Write-Log "ECHEC : sauvegarde impossible, rien n'a ete applique."; exit 1 }

# 4. Migrations anterieures (enregistrement ou application), puis migrations du 30/09
function Get-Name([string]$file) { return [IO.Path]::GetFileNameWithoutExtension($file).Substring(15) }
foreach ($step in $Plan) {
  $version = $step.Name.Substring(0,14); $name = Get-Name $step.Name
  $record = "insert into supabase_migrations.schema_migrations(version, name) values ('$version', '$name') on conflict do nothing;"
  if ($step.Action -eq 'record') {
    Write-Log "Enregistrement (deja presente) : $($step.Name)"
    if ((Invoke-Psql $record) -ne 0) { Write-Log "ECHEC enregistrement $($step.Name)."; exit 1 }
  } else {
    Write-Log "Migration anterieure : $($step.Name)"
    $body = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $Root "supabase\migrations\$($step.Name)")
    if ((Invoke-Psql "begin;`n$body`n;$record`ncommit;`n") -ne 0) {
      Write-Log "ECHEC migration $($step.Name) (annulee). Restauration si besoin : docker exec $Container pg_restore -U postgres -d postgres --clean $Dump"
      exit 1
    }
  }
}
foreach ($file in ($Files | Where-Object { $_.Name.Substring(0,14) -in $Mine -and $_.Name.Substring(0,14) -notin $Applied })) {
  $version = $file.Name.Substring(0,14)
  $name = Get-Name $file.Name
  Write-Log "Migration : $($file.Name)"
  $body = Get-Content -Raw -Encoding UTF8 -LiteralPath $file.FullName
  $sql = "begin;`n$body`n;insert into supabase_migrations.schema_migrations(version, name) values ('$version', '$name') on conflict do nothing;`ncommit;`n"
  if ((Invoke-Psql $sql) -ne 0) {
    Write-Log "ECHEC migration $($file.Name) (annulee). Detail dans le journal."
    Write-Log "Restauration si besoin : docker exec $Container pg_restore -U postgres -d postgres --clean $Dump"
    exit 1
  }
}

# 5. pgTAP (utilise par les tests ; deja present si 'supabase test db' a ete utilise)
if ((Invoke-Psql 'create extension if not exists pgtap with schema extensions;' -Quiet) -ne 0) { Write-Log "ECHEC : extension pgtap indisponible : $script:PsqlOutput"; exit 1 }

# 6. Tests
$Tests = @('002_workflow_audit.sql','015_dossier_workflow_all_equipment.sql','016_reclassify_legacy_recette.sql','017_irr01_round.sql','018_clean_text_guard.sql')
$Failed = 0
foreach ($t in $Tests) {
  Add-Content -LiteralPath $Log -Value "----- $t -----" -Encoding UTF8
  if ((Invoke-SqlFile (Join-Path $Root "supabase\tests\$t")) -eq 0 -and $script:PsqlOutput -notmatch '(?m)^not ok') { Write-Log "REUSSI : $t" } else { Write-Log "ECHEC : $t"; $Failed++ }
}
if ($Failed -eq 0) { Write-Log 'TERMINE : migrations du 30/09 appliquees et tests reussis sur Docker.' }
else { Write-Log "TERMINE AVEC $Failed ECHEC(S) : voir le detail dans le journal."; exit 1 }
