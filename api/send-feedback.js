export default async function handler(request) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get the EmailJS credentials from environment variables
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the email parameters from the request body
    const emailParams = await request.json();

    // Prepare the request to EmailJS API
    const emailData = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,  // user_id is the public key in EmailJS API
      template_params: emailParams
    };

    // Send the request to EmailJS API
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.text || 'Failed to send email');
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Feedback sent successfully',
      response: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending feedback:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send feedback',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const config = {
  runtime: 'edge'  // Use edge runtime like your transit proxy
};