export function redact(val: any): any {
  if (typeof val === 'string') {
    // Cookie のマスク
    let redacted = val.replace(/(cookie:\s*)([^;\r\n]+)/gi, '$1[REDACTED]');
    // Authorization ヘッダーのマスク
    redacted = redacted.replace(/(authorization:\s*)([^\r\n]+)/gi, '$1[REDACTED]');
    // API キー / トークンのマスク
    redacted = redacted.replace(/(api[-_]?key|token|password|secret|auth)(["']?\s*[:=]\s*["']?)([^"'\r\n&]+)/gi, '$1$2[REDACTED]');
    return redacted;
  }
  
  if (Array.isArray(val)) {
    return val.map(v => redact(v));
  }

  if (val !== null && typeof val === 'object') {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (/cookie|authorization|api[-_]?key|token|password|secret|auth/i.test(k)) {
        res[k] = '[REDACTED]';
      } else {
        res[k] = redact(v);
      }
    }
    return res;
  }

  return val;
}
