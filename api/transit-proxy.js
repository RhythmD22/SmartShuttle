export default async function handler(request) {
  // Extract the API endpoint from the URL
  const { pathname } = new URL(request.url);
  const endpoint = pathname.replace('/api/transit', '');

  // Get the API key from environment variables
  const apiKey = process.env.TRANSIT_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Transit API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Construct the target URL for the Transit API
    const targetUrl = `https://external.transitapp.com/v3${endpoint}${request.url.split('?')[1] ? '?' + request.url.split('?')[1] : ''}`;

    // Prepare headers for the request to Transit API
    const headers = {
      'Content-Type': 'application/json',
      'apiKey': apiKey
    };

    // Forward the request to the Transit API
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.body ? await request.text() : undefined
    });

    // Return the response from the Transit API
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error forwarding request to Transit API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  runtime: 'edge'
};