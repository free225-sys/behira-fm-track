param(
  [string]$DatabaseUrl = $env:BEHIRA_TEST_DATABASE_URL
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$SupabaseCommand = Get-Command supabase -ErrorAction SilentlyContinue
$LocalSupabaseCommand = Join-Path $ProjectRoot 'node_modules\.bin\supabase.cmd'
$PsqlCommand = Get-Command psql -ErrorAction SilentlyContinue
$PSNativeCommandUseErrorActionPreference = $true

if ((Test-Path -LiteralPath $LocalSupabaseCommand) -or $SupabaseCommand) {
  Push-Location $ProjectRoot
  try {
    $Cli = if (Test-Path -LiteralPath $LocalSupabaseCommand) { $LocalSupabaseCommand } else { $SupabaseCommand.Source }
    & $Cli db reset

    # pg_prove only mounts supabase/tests. Reapply the production reference
    # seed through the local database container, then assert fixed counts.
    $SeedPath = Join-Path $ProjectRoot 'supabase\seed.sql'
    Get-Content -Raw -LiteralPath $SeedPath |
      docker exec -i supabase_db_behira-fm-track psql -U postgres -d postgres -v ON_ERROR_STOP=1

    & $Cli test db
  }
  finally {
    Pop-Location
  }
  exit 0
}

if ($PsqlCommand -and $DatabaseUrl) {
  $MigrationFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'supabase\migrations') -Filter '*.sql' | Sort-Object Name
  foreach ($MigrationFile in $MigrationFiles) {
    psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $MigrationFile.FullName
  }
  psql $DatabaseUrl -v ON_ERROR_STOP=1 -f (Join-Path $ProjectRoot 'supabase\seed.sql')
  $TestFiles = Get-ChildItem -LiteralPath (Join-Path $ProjectRoot 'supabase\tests') -Filter '*.sql' | Sort-Object Name
  foreach ($TestFile in $TestFiles) {
    psql $DatabaseUrl -v ON_ERROR_STOP=1 -f $TestFile.FullName
  }
  exit 0
}

throw 'Aucun moteur SQL local disponible. Installer Supabase CLI, ou fournir BEHIRA_TEST_DATABASE_URL avec psql.'
