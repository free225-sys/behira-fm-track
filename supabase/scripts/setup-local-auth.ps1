$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $true

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cli = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"

if (-not (Test-Path -LiteralPath $cli)) {
  throw "Supabase CLI is not installed in this project."
}

$statusOutput = & $cli status -o env 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "The local Supabase stack is not available."
}

$values = @{}
foreach ($line in $statusOutput) {
  if ($line -match '^([A-Z0-9_]+)=(.*)$') {
    $value = $matches[2].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$matches[1]] = $value
  }
}

$publicKey = if ($values.ContainsKey("PUBLISHABLE_KEY")) {
  $values["PUBLISHABLE_KEY"]
} else {
  $values["ANON_KEY"]
}

if (-not $values["API_URL"] -or -not $values["SERVICE_ROLE_KEY"] -or -not $publicKey) {
  throw "Supabase local credentials could not be resolved."
}

$env:SUPABASE_URL = $values["API_URL"]
$env:SUPABASE_SERVICE_ROLE_KEY = $values["SERVICE_ROLE_KEY"]
$env:BEHIRA_LOCAL_AUTH_PASSWORD = "Behira-Demo-2026!"

try {
  & node (Join-Path $PSScriptRoot "seed-local-auth.mjs")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $fixturePath = Join-Path $projectRoot "supabase\fixtures\demo_anomalies.sql"
  Get-Content -Raw -LiteralPath $fixturePath |
    docker exec -i supabase_db_behira-fm-track psql -U postgres -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $localEnvironment = @(
    "# Generated for the local Supabase stack. Never commit this file.",
    "NEXT_PUBLIC_USE_SUPABASE=true",
    "NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true",
    "NEXT_PUBLIC_SUPABASE_URL=$($values['API_URL'])",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$publicKey",
    "SUPABASE_LOCAL_SERVICE_ROLE_KEY=$($values['SERVICE_ROLE_KEY'])"
  ) -join [Environment]::NewLine

  [System.IO.File]::WriteAllText(
    (Join-Path $projectRoot ".env.supabase.local"),
    $localEnvironment + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
  )
} finally {
  Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:BEHIRA_LOCAL_AUTH_PASSWORD -ErrorAction SilentlyContinue
}

Write-Output "Local Auth accounts, integration fixtures and the isolated local test environment are ready."
