export default async function handler(request, response) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the EmailJS credentials from environment variables
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;

    // Get the email parameters from the request body
    const emailParams = request.body;
    
    // Validate required fields
    if (!emailParams.issue_type || !emailParams.description) {
      return response.status(400).json({ 
        error: 'Missing required fields', 
        details: 'Both issue_type and description are required' 
      });
    }

    // Only attempt EmailJS if credentials are provided
    if (serviceId && templateId && publicKey) {
      // Prepare the request to EmailJS API
      const emailData = {
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,  // user_id is the public key in EmailJS API
        template_params: emailParams
      };

      console.log('Sending email request to EmailJS:', { 
        serviceId, 
        templateId,
        hasIssueType: !!emailParams.issue_type,
        hasDescription: !!emailParams.description
      }); // Debug log

      // Send the request to EmailJS API
      const apiResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      console.log('EmailJS API responded with status:', apiResponse.status); // Debug log

      // Clone the response to be able to read it multiple times
      const clonedResponse = apiResponse.clone();
      
      // Try to parse the response as JSON first
      let result = {};
      let responseText = '';
      
      try {
        result = await apiResponse.json();
      } catch (parseError) {
        // If JSON parsing fails, try to get the text content
        try {
          responseText = await clonedResponse.text();
          console.error('Failed to parse JSON response, got text:', responseText);
          result = { raw_response: responseText };
        } catch (textError) {
          console.error('Failed to parse both JSON and text response:', textError);
          result = { error: 'Failed to process response from email service' };
        }
      }

      if (apiResponse.ok) {
        // Return success response
        return response.status(200).json({
          success: true,
          message: 'Feedback sent successfully',
          response: result
        });
      } else {
        console.error('EmailJS API error:', result);
        
        // If it's a 403 error, it's likely an authentication problem
        if (apiResponse.status === 403) {
          console.error('EmailJS authentication error - check your credentials');
          console.log('EmailJS credentials may be invalid. Saving feedback locally as fallback...');
        }
      }
    } else {
      console.log('EmailJS credentials not configured. Saving feedback locally as fallback...');
    }

    // Fallback: Save feedback to a local log file or database
    // In a real implementation, you'd want to save this to a database
    // For now, we'll log to console which can be captured by server logs
    console.log('FEEDBACK RECEIVED (fallback):', {
      timestamp: new Date().toISOString(),
      ...emailParams
    });
    
    // Even if EmailJS fails, return success to the user so they don't get discouraged
    return response.status(200).json({
      success: true,
      message: 'Feedback received successfully (using fallback system)',
      response: { fallback: true, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return response.status(500).json({
      error: 'Failed to process feedback',
      details: error.message
    });
  }
}

export const config = {
  runtime: 'nodejs'
};