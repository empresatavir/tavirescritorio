export async function darkflowRequest(base: string, pathname: string, options: { method?: string; csrf?: string; body?: unknown } = {}): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (options.csrf) headers['X-CSRF-Token'] = options.csrf;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base.replace(/\/$/, '')}${pathname}`, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as Record<string, unknown> : {};
  if (!response.ok) {
    throw new Error(typeof payload.detail === 'string' ? payload.detail : `DarkFlow respondeu ${response.status}`);
  }
  return payload;
}
