/* eslint-env node */

function sanitizeText(text, maxLength = 5000) {
  if (!text) return '';
  return String(text)
    .replace(/```/g, '`\u200B`\u200B`')
    .replace(/^\s*#{1,6}\s/gm, '\\# ')
    .substring(0, maxLength)
    .trim();
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { issue_type, description, attachment_info } = request.body;

    if (!issue_type || !description) {
      return response.status(400).json({
        error: 'Missing required fields',
        details: 'Both issue_type and description are required',
      });
    }

    const sanitizedIssueType = sanitizeText(issue_type, 200);
    const sanitizedDescription = sanitizeText(description, 5000);
    const sanitizedAttachmentInfo = sanitizeText(attachment_info, 500);

    const {
      GITHUB_TOKEN: githubToken,
      GITHUB_REPO_OWNER: repoOwner,
      GITHUB_REPO_NAME: repoName,
    } = process.env;

    if (!githubToken || !repoOwner || !repoName) {
      console.error('GitHub feedback configuration missing');
      return response.status(500).json({
        error: 'Feedback system not configured',
      });
    }

    const issueData = {
      title: `Feedback: ${sanitizedIssueType}`,
      body: `**Issue Type:** ${sanitizedIssueType}\n\n**Description:**\n${sanitizedDescription}\n\n**From:** SmartShuttle Feedback Form\n**Timestamp:** ${new Date().toISOString()}\n\n**Attachment Info:** ${sanitizedAttachmentInfo || 'No attachment'}`,
      labels: ['feedback', 'smartshuttle'],
    };

    const githubResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      }
    );

    if (!githubResponse.ok) {
      const errorData = await githubResponse.json();
      console.error('GitHub API error:', errorData);
      return response.status(githubResponse.status).json({
        error: 'Failed to create GitHub issue',
        details: errorData,
      });
    }

    const result = await githubResponse.json();

    console.log('Feedback created as GitHub issue:', result.number);

    return response.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      response: { issueNumber: result.number, url: result.url },
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    // Log feedback to server even if GitHub API fails
    console.log('FEEDBACK LOGGED (GitHub API failed):', {
      timestamp: new Date().toISOString(),
      ...request.body,
      error: error.message,
    });

    return response.status(500).json({
      error: 'Failed to create GitHub issue, but feedback was logged',
      details: error.message,
    });
  }
}

export const config = {
  runtime: 'nodejs',
};