const requestBuckets = new Map<string, { count: number; expires: number }>();

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

// Best-effort per-instance throttling. Serverless instances do not share this
// map, so this is a safeguard—not a substitute for a distributed rate limiter.
export function rateLimit(request: Request, key: string, limit: number, windowMs = 60_000): boolean {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = (request.headers.get("x-real-ip") || forwarded || "unknown").slice(0, 100);
  const bucketKey = key + ":" + ip;
  const now = Date.now();

  for (const [existingKey, bucket] of requestBuckets) {
    if (bucket.expires <= now) requestBuckets.delete(existingKey);
  }
  const current = requestBuckets.get(bucketKey);
  if (current && current.expires > now) {
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }
  requestBuckets.set(bucketKey, { count: 1, expires: now + windowMs });
  if (requestBuckets.size > 1_000) {
    const firstKey = requestBuckets.keys().next().value;
    if (firstKey) requestBuckets.delete(firstKey);
  }
  return true;
}
