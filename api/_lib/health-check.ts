
// api/_lib/health-check.ts

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
  return (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function toBase64(s: string) {
  try { return Buffer.from(s).toString('base64'); } catch {}
  // @ts-ignore
  return typeof btoa === 'function' ? btoa(s) : s;
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
  try {
    // Use Neon serverless driver directly for health checks
    const { neon } = await import('@neondatabase/serverless');
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return {
        name: 'database',
        status: 'fail',
        latencyMs: Math.round(nowMs() - start),
        error: 'DATABASE_URL environment variable not set',
      };
    }

    const sql = neon(databaseUrl);
    await withTimeout(sql`select 1 as ok`, 3000);

    return { name: 'database', status: 'pass', latencyMs: Math.round(nowMs() - start) };
  } catch (e: any) {
    return {
      name: 'database',
      status: 'fail',
      latencyMs: Math.round(nowMs() - start),
      error: String(e?.message || e),
    };
  }
}

async function checkAcuity(): Promise<HealthCheck> {
  const start = nowMs();
  const apiKey = process.env.ACUITY_API_KEY;
  const userId = process.env.ACUITY_USER_ID;
  if (!apiKey || !userId) {
    return {
      name: 'acuity',
      status: 'skip',
      latencyMs: Math.round(nowMs() - start),
      details: { reason: 'missing envs' },
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    // Identity endpoint is the simplest permission probe
    const r = await fetch('https://acuityscheduling.com/api/v1/me', {
      headers: { Authorization: 'Basic ' + toBase64(`${userId}:${apiKey}`) },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      let body: any = null;
      try { body = await r.text(); } catch {}
      throw new Error(`HTTP ${r.status} ${r.statusText}${body ? ` - ${body.slice(0,200)}` : ''}`);
    }

    const me = await r.json().catch(() => ({}));
    return { 
      name: 'acuity', 
      status: 'pass', 
      latencyMs: Math.round(nowMs() - start), 
      details: { account: me?.account_name ?? me?.email ?? 'ok' } 
    };
  } catch (e: any) {
    return {
      name: 'acuity',
      status: 'fail',
      latencyMs: Math.round(nowMs() - start),
      error: String(e?.message || e),
    };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  const start = nowMs();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return {
      name: 'openai',
      status: 'skip',
      latencyMs: Math.round(nowMs() - start),
      details: { reason: 'missing env' },
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { name: 'openai', status: 'pass', latencyMs: Math.round(nowMs() - start) };
  } catch (e: any) {
    return {
      name: 'openai',
      status: 'fail',
      latencyMs: Math.round(nowMs() - start),
      error: String(e?.message || e),
    };
  }
}

function summarize(checks: HealthCheck[]): Overall {
  const criticalFail =
    checks.some((c) => c.name === 'env' && c.status === 'fail') ||
    checks.some((c) => c.name === 'database' && c.status === 'fail');

  if (criticalFail) return 'unhealthy';
  const hasFail = checks.some((c) => c.status === 'fail');
  return hasFail ? 'degraded' : 'healthy';
}

export async function performHealthCheck(): Promise<HealthReport> {
  const results: HealthCheck[] = [];

  const env = await checkEnvs();
  results.push(env);

  const db = await checkDatabase();
  results.push(db);

  const [acuity, openai] = await Promise.allSettled([checkAcuity(), checkOpenAI()]);
  results.push(
    acuity.status === 'fulfilled'
      ? acuity.value
      : { name: 'acuity', status: 'fail', error: String(acuity.reason) },
  );
  results.push(
    openai.status === 'fulfilled'
      ? openai.value
      : { name: 'openai', status: 'fail', error: String(openai.reason) },
  );

  return {
    status: summarize(results),
    checks: results,
  };
}
