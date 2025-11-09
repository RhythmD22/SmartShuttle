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

    // Use the shared refresh functionality
    initializeRefreshButton();

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
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Feedback';
                return;
            }

            // Additional validation for file size (limit to 5MB) using shared utility
            if (attachmentInput && attachmentInput.files.length > 0) {
                const file = attachmentInput.files[0];
                if (!validateFileSize(file)) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Feedback';
                    return;
                }
            }

            // Prepare basic email parameters for EmailJS
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
                        // Update emailParams with base64 image data for EmailJS
                        emailParams.image_attachment = event.target.result;
                        emailParams.attachment_name = file.name;

                        // Include attachment metadata in the attachment_info
                        emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                        // Send the email through our API proxy
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
                                if (data.success) {
                                    console.log('SUCCESS!', data);

                                    // Show success message to user
                                    alert('Thank you for your feedback!');

                                    // Reset form
                                    if (issueType) issueType.value = '';
                                    if (descriptionText) descriptionText.value = '';

                                    // Use shared utility to reset attachment UI
                                    resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

                                    // Re-enable submit button
                                    submitBtn.disabled = false;
                                    submitBtn.textContent = originalText; // Restore original text
                                } else {
                                    throw new Error(data.error || 'Failed to send feedback');
                                }
                            })
                            .catch(function (error) {
                                console.log('FAILED...', error);
                                // Show error message to user
                                alert('Error: Failed to send feedback. Please try again later.\n\nError details: ' + error.message);

                                // Re-enable submit button
                                submitBtn.disabled = false;
                                submitBtn.textContent = originalText; // Restore original text
                            });
                    };

                    reader.onerror = function () {
                        console.error("Error reading file");
                        alert('Error reading the file. Please try again.');

                        // Include attachment metadata in the attachment_info even if there's an error reading the file
                        emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                        // Still send the email without the actual attachment data through our API proxy
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
                                if (data.success) {
                                    console.log('SUCCESS without attachment!', data);

                                    alert('Thank you for your feedback! It has been sent successfully (without attachment).');

                                    if (issueType) issueType.value = '';
                                    if (descriptionText) descriptionText.value = '';

                                    // Use shared utility to reset attachment UI
                                    resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

                                    submitBtn.disabled = false;
                                    submitBtn.textContent = originalText;
                                } else {
                                    throw new Error(data.error || 'Failed to send feedback');
                                }
                            })
                            .catch(function (error) {
                                console.log('FAILED...', error);
                                alert('Error: Failed to send feedback. Please try again later.\n\nError details: ' + error.message);

                                submitBtn.disabled = false;
                                submitBtn.textContent = originalText;
                            });
                    };

                    reader.readAsDataURL(file); // Convert image to base64
                    return; // Return early since we're handling asynchronously
                } else {
                    // For non-image files, include the metadata in attachment_info
                    emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;
                }
            }

            // Send email through our API proxy
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
                    if (data.success) {
                        console.log('SUCCESS!', data);

                        // Show success message to user
                        alert('Thank you for your feedback!');

                        // Reset form
                        if (issueType) issueType.value = '';
                        if (descriptionText) descriptionText.value = '';

                        // Use shared utility to reset attachment UI
                        resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

                        // Re-enable submit button
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText; // Restore original text
                    } else {
                        throw new Error(data.error || 'Failed to send feedback');
                    }
                })
                .catch(function (error) {
                    console.log('FAILED...', error);
                    // Show error message to user
                    alert('Error: Failed to send feedback. Please try again later.\n\nError details: ' + error.message);

                    // Re-enable submit button
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText; // Restore original text
                });
        });
    }
}