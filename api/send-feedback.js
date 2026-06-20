/* eslint-env node */

function sanitizeText(text, maxLength = 5000) {
  if (!text) return '';
  return String(text)
    .replace(/```/g, '`\u200B`\u200B`')
    .replace(/^\s*#{1,6}\s/gm, '\\# ')
    .substring(0, maxLength)
    .trim();
}

function decodeBase64Image(dataUrl) {
  const matches = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/i);
  if (!matches) return null;
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > 4 * 1024 * 1024) return null;
  return { buffer, mimeType };
}

function getExtensionFromMime(mimeType) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
  };
  return map[mimeType] || '.png';
}

async function uploadImageToRepo(githubToken, repoOwner, repoName, issueNumber, fileName, buffer) {
  const base64Content = buffer.toString('base64');
  const path = `.github/feedback/${issueNumber}/${fileName}`;

  const uploadResponse = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add feedback attachment for issue #${issueNumber}`,
        content: base64Content,
      }),
    }
  );

  if (!uploadResponse.ok) {
    console.error('Failed to upload image to repo:', await uploadResponse.json());
    return null;
  }

  const uploadResult = await uploadResponse.json();
  return uploadResult.content.download_url;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { issue_type, description, attachment_info, image_attachment, attachment_name } =
      request.body;

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

    const timestamp = new Date().toISOString();
    let issueBody = `**Issue Type:** ${sanitizedIssueType}\n\n**Description:**\n${sanitizedDescription}\n\n**From:** SmartShuttle Feedback Form\n**Timestamp:** ${timestamp}\n\n**Attachment Info:** ${sanitizedAttachmentInfo || 'No attachment'}`;

    const issueData = {
      title: `Feedback: ${sanitizedIssueType}`,
      body: issueBody,
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

    if (image_attachment && image_attachment.startsWith('data:image/')) {
      const decoded = decodeBase64Image(image_attachment);
      if (decoded) {
        const ext = getExtensionFromMime(decoded.mimeType);
        const safeName = (attachment_name || 'screenshot').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = safeName.includes('.') ? safeName : safeName + ext;

        const imageUrl = await uploadImageToRepo(
          githubToken,
          repoOwner,
          repoName,
          result.number,
          fileName,
          decoded.buffer
        );

        if (imageUrl) {
          const updatedBody =
            issueBody + `\n\n![${sanitizeText(attachment_name || 'attachment', 200)}](${imageUrl})`;
          await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${result.number}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ body: updatedBody }),
            }
          );
          console.log('Image attached to issue:', result.number);
        } else {
          console.error('Image upload failed for issue:', result.number);
        }
      } else {
        console.error('Failed to decode image attachment for issue:', result.number);
      }
    }

    return response.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      response: { issueNumber: result.number, url: result.url },
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
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