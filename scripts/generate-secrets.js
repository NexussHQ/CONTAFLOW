const crypto = require('crypto');

function generateSecret() {
  return crypto.randomBytes(40).toString('hex');
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload, secret) {
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

const jwtSecret = generateSecret();
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 years
};

const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 10) // 10 years
};

const anonKey = sign(anonPayload, jwtSecret);
const serviceKey = sign(servicePayload, jwtSecret);

console.log('✅ SECRETS GENERATED SUCCESSFULLY');
console.log('Copy the block below into your Dokploy Environment Variables:\n');
console.log('---------------------------------------------------');
console.log(`POSTGRES_PASSWORD=${generateSecret()}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceKey}`);
console.log(`DASHBOARD_USERNAME=admin`);
console.log(`DASHBOARD_PASSWORD=${generateSecret()}`);
console.log('---------------------------------------------------');
