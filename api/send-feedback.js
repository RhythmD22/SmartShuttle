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

    if (!serviceId || !templateId || !publicKey) {
      console.error('EmailJS credentials not configured');
      return response.status(500).json({ error: 'Email service not configured' });
    }

    // Get the email parameters from the request body
    const emailParams = request.body;

    // Prepare the request to EmailJS API
    const emailData = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,  // user_id is the public key in EmailJS API
      template_params: emailParams
    };

    console.log('Sending email request to EmailJS:', { serviceId, templateId }); // Debug log

    // Send the request to EmailJS API
    const apiResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    console.log('EmailJS API responded with status:', apiResponse.status); // Debug log

    const result = await apiResponse.json().catch(() => ({})); // Safely parse response

    if (!apiResponse.ok) {
      console.error('EmailJS API error:', result);
      return response.status(apiResponse.status).json({
        error: 'Failed to send email',
        details: result
      });
    }

    // Return success response
    return response.status(200).json({
      success: true,
      message: 'Feedback sent successfully',
      response: result
    });
  } catch (error) {
    console.error('Error sending feedback:', error);
    return response.status(500).json({
      error: 'Failed to send feedback',
      details: error.message
    });
  }
}

export const config = {
  runtime: 'nodejs'
};