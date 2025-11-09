export default async function handler(request, response) {
  try {
    // Extract the API endpoint from the URL - construct complete URL with query parameters
    // In Next.js API routes, request.url includes the path and query string but not the protocol/host
    // We need to parse the path and query separately
    const urlParts = request.url.split('?');
    const pathname = urlParts[0];
    const search = urlParts.length > 1 ? '?' + urlParts[1] : '';
    
    const endpoint = pathname.replace('/api/transit', '');
    const searchParams = search; // This includes the ? and all parameters

    // Get the API key from environment variables
    const apiKey = process.env.TRANSIT_API_KEY;

    if (!apiKey) {
      console.error('TRANSIT_API_KEY is not configured');
      return response.status(500).json({ error: 'Transit API key not configured' });
    }

    // Ensure endpoint starts with a slash to create a valid URL
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    // Transit API v3 requires the /public prefix for public endpoints
    // Check if the endpoint already has /public, if not, add it
    const apiEndpoint = formattedEndpoint.startsWith('/public') ? formattedEndpoint : `/public${formattedEndpoint}`;
    
    // Construct the target URL for the Transit API, properly including query parameters
    const targetUrl = `https://external.transitapp.com/v3${apiEndpoint}${searchParams}`;
    
    // Validate the constructed URL
    try {
      new URL(targetUrl);
    } catch (urlError) {
      console.error('Invalid target URL constructed:', targetUrl, urlError);
      return response.status(400).json({ 
        error: 'Invalid API endpoint', 
        details: 'The requested endpoint is malformed' 
      });
    }

    console.log(`Forwarding request to: ${targetUrl}`); // Debug log

    // Prepare headers for the request to Transit API
    const headers = {
      'Content-Type': 'application/json',
      'apiKey': apiKey
    };

    // Log headers (excluding apiKey for security)
    const loggedHeaders = { ...headers };
    delete loggedHeaders.apiKey;
    console.log('Forwarding headers:', loggedHeaders);

    // Forward the request to the Transit API
    const apiResponse = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined
    });

    console.log(`Transit API responded with status: ${apiResponse.status}`); // Debug log

    if (!apiResponse.ok) {
      // If there's an error response, try to get more details
      let errorData = {};
      try {
        errorData = await apiResponse.json();
      } catch (e) {
        // If parsing as JSON fails, try to get the raw text response
        errorData.raw_response = await apiResponse.text();
      }
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