
// File: api/_lib/health-check.ts

type CheckStatus = 'pass' | 'fail' | 'skip';
type Overall = 'healthy' | 'degraded' | 'unhealthy';

export type HealthCheck = {
  name: string;
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
};

export type HealthReport = {
  status: Overall;
  checks: HealthCheck[];
};

const CRITICAL_ENVS = ['DATABASE_URL'];
const OPTIONAL_ENVS = ['CLERK_SECRET_KEY', 'ACUITY_API_KEY', 'ACUITY_USER_ID', 'OPENAI_API_KEY'];

function nowMs() {
  return performance?.now?.() ?? Date.now();
}

function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), ms);
  // @ts-ignore fetch-only use; callers must pass signal if they use fetch
  return new Promise((resolve, reject) => {
    p.then((v) => {
      clearTimeout(to);
      resolve(v);
    }).catch((e) => {
      clearTimeout(to);
      reject(e);
    });
  });
}

async function checkEnvs(): Promise<HealthCheck> {
  const start = nowMs();
  const missingCritical = CRITICAL_ENVS.filter((k) => !process.env[k]);
  const missingOptional = OPTIONAL_ENVS.filter((k) => !process.env[k]);

  const status: CheckStatus = missingCritical.length ? 'fail' : 'pass';
  return {
    name: 'env',
    status,
    latencyMs: Math.round(nowMs() - start),
    details: {
      missingCritical,
      missingOptional,
      found: [...CRITICAL_ENVS, ...OPTIONAL_ENVS].filter((k) => !!process.env[k]),
    },
    error: missingCritical.length ? `Missing required env(s): ${missingCritical.join(', ')}` : undefined,
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = nowMs();

  // Try using your existing storage adapter if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { storage } = await import('./storage.js').catch(() => ({} as any));
    if (storage) {
      // Prefer a dedicated health endpoint if you have one
      if (typeof (storage as any).healthCheck === 'function') {
        await withTimeout((storage as any).healthCheck(), 3000, 'db healthCheck');
      } else {
        // Fallback: attempt a trivial query if your storage exposes a raw query
        if (typeof (storage as any).query === 'function') {
          await withTimeout((storage as any).query('select 1'), 3000, 'db select 1');
        } else if (typeof (storage as any).getNow === 'function') {
          await withTimeout((storage as any).getNow(), 3000, 'db getNow');
        } else {
          // Last resort: try @neondatabase/serverless directly if installed
          await neonDirectPing();
        }
      }
      return { name: 'database', status: 'pass', latencyMs: Math.round(nowMs() - start) };
    }
  } catch (e: any) {
    return { name: 'database', status: 'fail', latencyMs: Math.round(nowMs() - start), error: String(e?.message || e) };
  }

  // storage.js missing; try neon directly
  try {
    await neonDirectPing();
    return { name: 'database', status: 'pass', latencyMs: Math.round(nowMs() - start) };
  } catch (e: any) {
    return { name: 'database', status: 'fail', latencyMs: Math.round(nowMs() - start), error: String(e?.message || e) };
  }
}

async function neonDirectPing() {
  // Optional direct Neon ping if storage adapter is not available
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  // Dynamic import to avoid bundling if not installed
  const mod = await import('@neondatabase/serverless').catch(() => null);
  if (!mod) throw new Error('@neondatabase/serverless not installed');
  // @ts-ignore
  const sql = mod.neon(url);
  // @ts-ignore
  await sql`select 1`;
}

async function checkAcuity(): Promise<HealthCheck> {
  const start = nowMs();
  const apiKey = process.env.ACUITY_API_KEY;
  const userId = process.env.ACUITY_USER_ID;
  if (!apiKey || !userId) {
    return { name: 'acuity', status: 'skip', latencyMs: Math.round(nowMs() - start), details: { reason: 'missing envs' } };
  }
  try {
    // Minimal request with tight timeout. Adjust endpoint if needed.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const url = `https://acuityscheduling.com/api/v1/appointments?minDate=${since}&max=1`;
    const r = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(`${userId}:${apiKey}`).toString('base64') },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { name: 'acuity', status: 'pass', latencyMs: Math.round(nowMs() - start) };
  } catch (e: any) {
    return { name: 'acuity', status: 'fail', latencyMs: Math.round(nowMs() - start), error: String(e?.message || e) };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  const start = nowMs();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { name: 'openai', status: 'skip', latencyMs: Math.round(nowMs() - start), details: { reason: 'missing env' } };
  }
  try {
    // Very light probe using models endpoint; avoid generating text to save quota
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { name: 'openai', status: 'pass', latencyMs: Math.round(nowMs() - start) };
  } catch (e: any) {
    return { name: 'openai', status: 'fail', latencyMs: Math.round(nowMs() - start), error: String(e?.message || e) };
  }
}

function summarize(checks: HealthCheck[]): Overall {
  const failedCritical = checks.some((c) => c.name === 'env' && c.status === 'fail') || checks.some((c) => c.name === 'database' && c.status === 'fail');
  if (failedCritical) return 'unhealthy';
  const hasFail = checks.some((c) => c.status === 'fail');
  if (hasFail) return 'degraded';
  return 'healthy';
}

export async function performHealthCheck(): Promise<HealthReport> {
  const results: HealthCheck[] = [];

  const env = await checkEnvs();
  results.push(env);

  const db = await checkDatabase();
  results.push(db);

  // Non-critical integrations
  const [acuity, openai] = await Promise.allSettled([checkAcuity(), checkOpenAI()]);
  if (acuity.status === 'fulfilled') results.push(acuity.value);
  else results.push({ name: 'acuity', status: 'fail', error: String(acuity.reason) });
  if (openai.status === 'fulfilled') results.push(openai.value);
  else results.push({ name: 'openai', status: 'fail', error: String(openai.reason) });

  return {
    status: summarize(results),
    checks: results,
  };
}
