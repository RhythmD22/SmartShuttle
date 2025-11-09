export default async function handler(request, response) {
  try {
    // Extract the API endpoint from the URL - construct complete URL with query parameters
    const { pathname, search } = new URL(request.url);
    const endpoint = pathname.replace('/api/transit', '');
    const searchParams = search; // This includes the ? and all parameters

    // Get the API key from environment variables
    const apiKey = process.env.TRANSIT_API_KEY;

    if (!apiKey) {
      console.error('TRANSIT_API_KEY is not configured');
      return response.status(500).json({ error: 'Transit API key not configured' });
    }

    // Construct the target URL for the Transit API, properly including query parameters
    const targetUrl = `https://external.transitapp.com/v3${endpoint}${searchParams}`;

    console.log(`Forwarding request to: ${targetUrl}`); // Debug log

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

    console.log(`Transit API responded with status: ${apiResponse.status}`); // Debug log

    if (!apiResponse.ok) {
      // If there's an error response, return it properly
      const errorData = await apiResponse.json().catch(() => ({})); // Safely parse error response
      console.error('Transit API error response:', errorData);
      return response.status(apiResponse.status).json({
        error: 'Transit API error',
        details: errorData
      });
    }

    // Return the response from the Transit API
    const data = await apiResponse.json();
    return response.status(apiResponse.status).json(data);

  } catch (error) {
    console.error('Error in transit proxy:', error);
    return response.status(500).json({
      error: 'Error forwarding request to Transit API',
      details: error.message
    });
  }
}

export const config = {
  runtime: 'nodejs'
};