export default async function handler(request, response) {
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

    // Transit API v3 requires the /public prefix for public endpoints
    // Check if the endpoint already has /public, if not, add it
    const apiEndpoint = formattedEndpoint.startsWith('/public') ? formattedEndpoint : `/public${formattedEndpoint}`;
    const targetUrl = `https://external.transitapp.com/v3${apiEndpoint}${searchParams}`;

    try {
      new URL(targetUrl);
    } catch (urlError) {
      console.error('Invalid target URL constructed:', targetUrl, urlError);
      return response.status(400).json({
        error: 'Invalid API endpoint',
        details: 'The requested endpoint is malformed'
      });
    }

    console.log(`Forwarding request to: ${targetUrl}`);

    const headers = {
      'Content-Type': 'application/json',
      'apiKey': apiKey
    };

    // Log headers (excluding apiKey for security)
    const loggedHeaders = { ...headers };
    delete loggedHeaders.apiKey;
    console.log('Forwarding headers:', loggedHeaders);

    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined
    });

    console.log(`Transit API responded with status: ${apiResponse.status}`);
    if (!apiResponse.ok) {
      let errorData = {};

      try {
        errorData = await apiResponse.json();
      } catch (e) {
        errorData.raw_response = await apiResponse.text();
      }
      console.error('Transit API error response:', errorData);
      return response.status(apiResponse.status).json({
        error: 'Transit API error',
        details: errorData
      });
    }

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