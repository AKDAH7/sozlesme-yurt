type Bucket = {
  resetAt: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = Math.max(250, Math.floor(params.windowMs));
  const limit = Math.max(1, Math.floor(params.limit));

  const existing = buckets.get(params.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(params.key, { resetAt: now + windowMs, count: 1 });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    return { ok: false, retryAfterSeconds };
  }

  existing.count += 1;
  buckets.set(params.key, existing);
  return { ok: true };
}

export function cleanupRateLimitBuckets(): void {
  const now = Date.now();
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}
