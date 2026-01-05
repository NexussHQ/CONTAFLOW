#!/usr/bin/env node
/**
 * Supabase Secrets Generator for Dokploy
 * 
 * This script generates ALL environment variables needed for a complete
 * Supabase self-hosted deployment. The output can be directly pasted
 * into Dokploy's Environment Variables section.
 * 
 * Usage: node scripts/generate-secrets.js [options]
 * 
 * Options:
 *   --domain <domain>    Your Supabase API domain (e.g., supabase.example.com)
 *   --app-url <url>      Your application URL (e.g., https://app.example.com)
 */

const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
let supabaseDomain = 'supabase-contaflow-744afe27d149c9e2.bnex.cloud';
let appUrl = 'https://contaflow.bnex.cloud';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--domain' && args[i + 1]) {
    supabaseDomain = args[i + 1];
    i++;
  }
  if (args[i] === '--app-url' && args[i + 1]) {
    appUrl = args[i + 1];
    i++;
  }
}

// Helper functions
function generateSecret(bytes = 40) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateBase64(bytes = 48) {
  return crypto.randomBytes(bytes).toString('base64');
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Generate all secrets
const jwtSecret = generateSecret();
const postgresPassword = generateSecret();
const dashboardPassword = generateSecret(20);
const secretKeyBase = generateBase64(48);
const vaultEncKey = crypto.randomBytes(16).toString('hex'); // exactly 32 chars
const pgMetaCryptoKey = generateBase64(24);
const logflarePublicToken = generateSecret(24);
const logflarePrivateToken = generateSecret(24);

// Generate JWT tokens (10 year expiry)
const now = Math.floor(Date.now() / 1000);
const tenYears = 60 * 60 * 24 * 365 * 10;

const anonKey = signJwt({
  role: 'anon',
  iss: 'supabase',
  iat: now,
  exp: now + tenYears
}, jwtSecret);

const serviceRoleKey = signJwt({
  role: 'service_role',
  iss: 'supabase',
  iat: now,
  exp: now + tenYears
}, jwtSecret);

// Build the complete environment block
const supabaseUrl = `https://${supabaseDomain}`;

const envBlock = `# =============================================================================
# SUPABASE DOKPLOY ENVIRONMENT VARIABLES
# Generated: ${new Date().toISOString()}
# =============================================================================
# Copy this entire block and paste it into Dokploy > Your Compose > Environment
# =============================================================================

# --- SECRETS & KEYS ---
POSTGRES_PASSWORD=${postgresPassword}
JWT_SECRET=${jwtSecret}
ANON_KEY=${anonKey}
SERVICE_ROLE_KEY=${serviceRoleKey}
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${dashboardPassword}
SECRET_KEY_BASE=${secretKeyBase}
VAULT_ENC_KEY=${vaultEncKey}
PG_META_CRYPTO_KEY=${pgMetaCryptoKey}

# --- DATABASE ---
POSTGRES_HOST=db
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_PORT=5432

# --- SUPAVISOR (Connection Pooler) ---
POOLER_PROXY_PORT_TRANSACTION=6543
POOLER_DEFAULT_POOL_SIZE=20
POOLER_MAX_CLIENT_CONN=100
POOLER_TENANT_ID=contaflow
POOLER_DB_POOL_SIZE=5

# --- KONG (API Gateway) ---
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

# --- POSTGREST ---
PGRST_DB_SCHEMAS=public,storage,graphql_public

# --- AUTH (GoTrue) ---
SITE_URL=${appUrl}
ADDITIONAL_REDIRECT_URLS=${appUrl}/**,http://localhost:3000/**
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=${supabaseUrl}

MAILER_URLPATHS_CONFIRMATION=/auth/v1/verify
MAILER_URLPATHS_INVITE=/auth/v1/verify
MAILER_URLPATHS_RECOVERY=/auth/v1/verify
MAILER_URLPATHS_EMAIL_CHANGE=/auth/v1/verify

ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-smtp-password
SMTP_SENDER_NAME=ContaFlow
ENABLE_ANONYMOUS_USERS=false

ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false

# --- STUDIO ---
STUDIO_DEFAULT_ORGANIZATION=ContaFlow
STUDIO_DEFAULT_PROJECT=ContaFlow-Prod
SUPABASE_PUBLIC_URL=${supabaseUrl}
IMGPROXY_ENABLE_WEBP_DETECTION=true
OPENAI_API_KEY=

# --- EDGE FUNCTIONS ---
FUNCTIONS_VERIFY_JWT=false

# --- LOGS / ANALYTICS (Logflare) ---
LOGFLARE_PUBLIC_ACCESS_TOKEN=${logflarePublicToken}
LOGFLARE_PRIVATE_ACCESS_TOKEN=${logflarePrivateToken}
DOCKER_SOCKET_LOCATION=/var/run/docker.sock
`;

// Output
console.log('\n' + '='.repeat(80));
console.log('✅ SUPABASE ENVIRONMENT VARIABLES GENERATED SUCCESSFULLY');
console.log('='.repeat(80));
console.log(`\n📌 Supabase API URL: ${supabaseUrl}`);
console.log(`📌 App URL: ${appUrl}`);
console.log('\n' + '-'.repeat(80));
console.log('📋 Copy EVERYTHING below this line into Dokploy Environment Variables:');
console.log('-'.repeat(80) + '\n');

console.log(envBlock);

console.log('-'.repeat(80));
console.log('\n⚠️  IMPORTANT: Before deploying, update these values:');
console.log('   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (for email)');
console.log('   - OPENAI_API_KEY (optional, for AI features in Studio)');
console.log('\n💡 TIP: Run with custom domains:');
console.log('   node scripts/generate-secrets.js --domain YOUR_DOMAIN --app-url https://YOUR_APP');
console.log('='.repeat(80) + '\n');
