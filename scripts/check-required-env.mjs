const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
const shouldValidate = ['preview', 'production'].includes(vercelEnv);

if (!shouldValidate) {
  process.exit(0);
}

const requiredEnv = [
  'GROQ_API_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missing = requiredEnv.filter((key) => !String(process.env[key] || '').trim());

if (!missing.length) {
  process.exit(0);
}

console.error('[env-check] Deployment blocked: required environment variables are missing.');
console.error(`[env-check] Target: ${vercelEnv}`);
missing.forEach((key) => {
  console.error(`[env-check] Missing: ${key}`);
});
console.error('[env-check] Configure the missing values in Vercel project settings, then redeploy.');
process.exit(1);
