import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return {}
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) env[key] = value
  }
  return env
}

const envLocal = loadEnvLocal()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || envLocal.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY

const userId = process.argv[2]
if (!userId) {
  console.error('Usage: node scripts/set-admin.mjs <USER_ID>')
  process.exit(1)
}

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceKey)

const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
  app_metadata: { is_admin: true },
})

if (error) {
  console.error('Failed to set admin:', error.message)
  process.exit(1)
}

console.log(`Admin flag set for ${data.user?.id}`)
