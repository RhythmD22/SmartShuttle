// JavaScript for Feedback page
// Import shared utilities
// Note: In a real project, we'd use proper module imports, but for now we assume utils.js is loaded before this file

document.addEventListener('DOMContentLoaded', function () {
    initializeDesktopNotification();
    initializeFeedbackForm();
});

// Initialize feedback form functionality
function initializeFeedbackForm() {
    const submitBtn = document.getElementById('submitFeedback');
    const descriptionText = document.getElementById('descriptionText');
    const issueType = document.getElementById('issueType');
    const attachmentInput = document.getElementById('attachmentInput');
    const attachmentLabel = document.getElementById('attachmentLabel');
    const attachmentPreview = document.getElementById('attachmentPreview');
    const attachmentPreviewIcon = document.querySelector('#attachmentPreview .attachment-preview-icon');
    const attachmentPreviewText = document.querySelector('#attachmentPreview .attachment-preview-text');

    // Handle file selection
    if (attachmentInput) {
        attachmentInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                const file = this.files[0];

                // Use shared utility function to update preview
                updateAttachmentPreview(file, attachmentPreview, attachmentPreviewIcon, attachmentPreviewText);

                if (attachmentLabel) {
                    attachmentLabel.style.display = 'none';
                }
            }
        });
    }

    // Handle preview click to allow re-uploading
    if (attachmentPreview) {
        attachmentPreview.addEventListener('click', function () {
            // Use shared utility to reset attachment UI
            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function () {
            handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
        });
    }
}

// Main function to handle feedback submission
function handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
    // Get form values
    const selectedIssueType = issueType ? issueType.value : '';
    const descriptionValue = descriptionText ? descriptionText.value.trim() : '';

    // Validate required fields using shared utility
    if (!validateFormFields({ 'issue type': selectedIssueType, 'description': descriptionValue })) {
        return;
    }

    // Disable submit button during submission to prevent duplicate submissions
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    // Additional validation for description length using shared utility
    if (!validateDescriptionLength(descriptionValue)) {
        resetSubmitButton(submitBtn, originalText);
        return;
    }

    // Additional validation for file size (limit to 5MB) using shared utility
    if (attachmentInput && attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0];
        if (!validateFileSize(file)) {
            resetSubmitButton(submitBtn, originalText);
            return;
        }
    }

    // Prepare basic email parameters for the API
    let emailParams = {
        to_name: 'Rhythm Desai',
        issue_type: selectedIssueType,
        description: descriptionValue,
        attachment_info: attachmentInput && attachmentInput.files.length > 0 ? 'Attachment included' : 'No attachment'
    };

    // Handle file attachment if present
    if (attachmentInput && attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0];

        // For image files, convert to base64 to embed in email
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = function (event) {
                // Update emailParams with base64 image data
                emailParams.image_attachment = event.target.result;
                emailParams.attachment_name = file.name;

                // Include attachment metadata in the attachment_info
                emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                // Send the email through our API proxy
                sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
            };

            reader.onerror = function () {
                console.error("Error reading file");
                alert('Error reading the file. Please try again.');

                // Include attachment metadata in the attachment_info even if there's an error reading the file
                emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                // Still send the email without the actual attachment data through our API proxy
                sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "without attachment");
            };

            reader.readAsDataURL(file); // Convert image to base64
            return; // Return early since we're handling asynchronously
        } else {
            // For non-image files, include the metadata in attachment_info
            emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;
        }
    }

    // Send email through our API proxy without attachment processing
    sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
}

// Function to send feedback via API with attachment
function sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
    fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailParams)
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "");
        })
        .catch(function (error) {
            console.log('FAILED...', error);
            // Reset form state anyway so user can try again
            resetSubmitButton(submitBtn, originalText);
        });
}

// Function to send feedback via API without attachment when file read fails
function sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
    fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailParams)
    })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage);
        })
        .catch(function (error) {
            console.log('FAILED...', error);
            // Reset form state anyway so user can try again
            resetSubmitButton(submitBtn, originalText);
        });
}

// Generic function to handle API responses
function handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
    if (data.success) {
        console.log('SUCCESS!', data);

        // Show success message to user
        alert(`Thank you for your feedback!${suffixMessage ? ' It has been sent successfully (' + suffixMessage + ').' : ''}`);

        // Reset form
        if (issueType) issueType.value = '';
        if (descriptionText) descriptionText.value = '';

        // Use shared utility to reset attachment UI
        resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

        // Re-enable submit button
        resetSubmitButton(submitBtn, originalText);
    } else {
        // Hide error popup but still handle error appropriately
        console.log('FAILED...', data.error || 'Failed to send feedback');

        // Reset form state anyway so user can try again
        resetSubmitButton(submitBtn, originalText);
    }
}

// Function to reset submit button state
function resetSubmitButton(submitBtn, originalText) {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
}