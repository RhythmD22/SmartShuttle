const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 120;
const requestCounts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// Prune stale entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of requestCounts) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
        requestCounts.delete(ip);
      }
    }
  }, RATE_LIMIT_WINDOW);
}

export default async function handler(request, response) {
  const clientIp = request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown';

  if (isRateLimited(clientIp)) {
    return response.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const [pathname, ...searchParts] = request.url.split('?');
    const search = searchParts.length > 0 ? '?' + searchParts.join('?') : '';

    const endpoint = pathname.replace('/api/transit', '');
    const searchParams = search;

    const { TRANSIT_API_KEY: apiKey } = process.env;

    if (!apiKey) {
      console.error('TRANSIT_API_KEY is not configured');
      return response.status(500).json({ error: 'Transit API key not configured' });
    }

    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const apiEndpoint = formattedEndpoint.startsWith('/public')
      ? formattedEndpoint
      : `/public${formattedEndpoint}`;
    const targetUrl = `https://external.transitapp.com/v4${apiEndpoint}${searchParams}`;

    try {
      new URL(targetUrl);
    } catch (urlError) {
      console.error('Invalid target URL constructed:', targetUrl, urlError);
      return response.status(400).json({
        error: 'Invalid API endpoint',
        details: 'The requested endpoint is malformed',
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      apiKey: apiKey,
    };

    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!apiResponse.ok) {
      let errorData = {};

      try {
        errorData = await apiResponse.json();
      } catch (e) {
        errorData = { raw_response: await apiResponse.text() };
      }
      console.error('Transit API error response:', errorData);
      return response.status(apiResponse.status).json({
        error: 'Transit API error',
        details: errorData,
      });
    }

    const data = await apiResponse.json();
    return response.status(apiResponse.status).json(data);
  } catch (error) {
    console.error('Error in transit proxy:', error);
    return response.status(500).json({
      error: 'Error forwarding request to Transit API',
      details: error.message,
    });
  }
}

export const config = {
  runtime: 'nodejs',
};