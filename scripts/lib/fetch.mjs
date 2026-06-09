const DEFAULT_HEADERS = {
  'User-Agent': 'CuratedSkills/1.0 (+https://github.com/)',
  Accept: 'text/plain, application/json',
};

export async function fetchText(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function checkUrl(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (response.status === 405 || response.status === 403) {
      const getResponse = await fetch(url, {
        method: 'GET',
        headers: { ...DEFAULT_HEADERS, Range: 'bytes=0-0' },
        signal: controller.signal,
      });
      return getResponse.ok || getResponse.status === 206;
    }

    return response.ok;
  } catch {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { ...DEFAULT_HEADERS, Range: 'bytes=0-0' },
        signal: controller.signal,
      });
      return response.ok || response.status === 206;
    } catch {
      return false;
    }
  } finally {
    clearTimeout(timer);
  }
}