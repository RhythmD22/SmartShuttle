export default async function handler(request, response) {
  // Extract the API endpoint from the URL
  const { pathname } = new URL(request.url);
  const endpoint = pathname.replace('/api/transit', '');

  // Get the API key from environment variables
  const apiKey = process.env.TRANSIT_API_KEY;

  if (!apiKey) {
    return response.status(500).json({ error: 'Transit API key not configured' });
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
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined
    });

    // Return the response from the Transit API
    const data = await apiResponse.json();
    return response.status(apiResponse.status).json(data);

  } catch (error) {
    return response.status(500).json({ error: 'Error forwarding request to Transit API' });
  }
}

export const config = {
  runtime: 'nodejs'
};