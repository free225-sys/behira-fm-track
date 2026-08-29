const baseUrl = process.env.BEHIRA_BASE_URL ?? 'http://localhost:3000'

const fontAssets = [
  '/fonts/geist-sans/Geist-Variable.woff2',
  '/fonts/geist-mono/GeistMono-Variable.woff2',
]

const failures = []

for (const assetPath of fontAssets) {
  const assetUrl = new URL(assetPath, baseUrl)

  try {
    const response = await fetch(assetUrl, { redirect: 'error' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const contentType = response.headers.get('content-type') ?? ''
    const bytes = new Uint8Array(await response.arrayBuffer())
    const signature = new TextDecoder('ascii').decode(bytes.slice(0, 4))

    if (signature !== 'wOF2') throw new Error('contenu WOFF2 invalide')
    if (!/font\/woff2|application\/octet-stream/i.test(contentType)) {
      throw new Error(`type de contenu inattendu : ${contentType || 'absent'}`)
    }

    console.log(`✓ ${assetPath} — HTTP 200, ${bytes.length} octets`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(`${assetPath} : ${message}`)
    console.error(`✗ ${assetPath} — ${message}`)
  }
}

if (failures.length) {
  throw new Error(`La recette typographique échoue : ${failures.join(' ; ')}`)
}

console.log('\nLes polices Geist sont servies sans erreur réseau.')
