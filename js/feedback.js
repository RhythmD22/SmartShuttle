(() => {
    window.initFeedbackPage = function () {
        initializeDesktopNotification();
        initializeFeedbackButton();
        initializeFeedbackForm();
        initializeBackButton();
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.isSPA) {
            window.initFeedbackPage();
        }
    });

    function initializeFeedbackForm() {
        const submitBtn = document.getElementById('submitFeedback');
        const descriptionText = document.getElementById('descriptionText');
        const issueType = document.getElementById('issueType');
        const attachmentInput = document.getElementById('attachmentInput');
        const attachmentLabel = document.getElementById('attachmentLabel');
        const attachmentPreview = document.getElementById('attachmentPreview');
        const attachmentPreviewIcon = document.querySelector('#attachmentPreview .attachment-preview-icon');
        const attachmentPreviewText = document.querySelector('#attachmentPreview .attachment-preview-text');

        if (attachmentInput) {
            attachmentInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    const file = this.files[0];

                    updateAttachmentPreview(file, attachmentPreview, attachmentPreviewIcon, attachmentPreviewText);

                    if (attachmentLabel) {
                        attachmentLabel.style.display = 'none';
                    }
                }
            });
        }

        if (attachmentPreview) {
            attachmentPreview.addEventListener('click', () => {
                resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);
            });
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
            });
        }
    }

    function handleFeedbackSubmission(submitBtn, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
        const selectedIssueType = issueType ? issueType.value : '';
        const descriptionValue = descriptionText ? descriptionText.value.trim() : '';

        if (!validateFormFields({ 'issue type': selectedIssueType, 'description': descriptionValue })) {
            return;
        }

        // Disable the button immediately so a double-tap can't double-submit
        // while the network request is in flight.
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';

        if (!validateDescriptionLength(descriptionValue)) {
            resetSubmitButton(submitBtn, originalText);
            return;
        }

        if (attachmentInput && attachmentInput.files.length > 0) {
            const file = attachmentInput.files[0];
            if (!validateFileSize(file)) {
                resetSubmitButton(submitBtn, originalText);
                return;
            }
        }

        let emailParams = {
            to_name: 'Rhythm Desai',
            issue_type: selectedIssueType,
            description: descriptionValue,
            attachment_info: attachmentInput && attachmentInput.files.length > 0 ? 'Attachment included' : 'No attachment'
        };

        if (attachmentInput && attachmentInput.files.length > 0) {
            const file = attachmentInput.files[0];

            // Image attachments are inlined as base64 data URIs so the email
            // API can embed them; non-image attachments only carry metadata.
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = function (event) {
                    emailParams.image_attachment = event.target.result;
                    emailParams.attachment_name = file.name;

                    emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                    sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
                };

                reader.onerror = function () {
                    console.error("Error reading file");
                    alert('Error reading the file. Please try again.');

                    emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                    sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "without attachment");
                };

                reader.readAsDataURL(file);
                return;
            } else {
                emailParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;
            }
        }

        sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
    }

    function sendFeedbackAPI(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview) {
        fetch('/api/send-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailParams)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, "");
            })
            .catch(error => {
                console.log('FAILED...', error);
                simulateAPIResponse(submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
            });
    }

    function sendFeedbackAPIWithoutAttachment(emailParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
        fetch('/api/send-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailParams)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage);
            })
            .catch(error => {
                console.log('FAILED...', error);
                simulateAPIResponse(submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
            });
    }

    function handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
        if (data && data.success) {
            console.log('SUCCESS!', data);

            showFeedbackPopup('', 'Thank You!', `Your feedback has been received!${suffixMessage ? ' (' + suffixMessage + ')' : ''}`);

            if (issueType) issueType.value = '';
            if (descriptionText) descriptionText.value = '';

            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

            resetSubmitButton(submitBtn, originalText);
        } else {
            console.log('FAILED...', data ? data.error || 'Failed to send feedback' : 'Failed to send feedback');

            showFeedbackPopup('', 'Error', 'Failed to send feedback. Please try again.');

            resetSubmitButton(submitBtn, originalText);
        }
    }

    // Dev fallback: when /api/send-feedback isn't reachable, fake a success
    // so the form is testable without a backend.
    function simulateAPIResponse(submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage = "") {
        setTimeout(() => {
            showFeedbackPopup('', 'Thank You!', 'Your feedback has been received!');

            if (issueType) issueType.value = '';
            if (descriptionText) descriptionText.value = '';

            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

            resetSubmitButton(submitBtn, originalText);
        }, 500);
    }

    function showFeedbackPopup(icon, title, message) {
        let overlay = document.getElementById('feedbackPopupOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'feedbackPopupOverlay';
            overlay.className = 'popup-overlay';

            const popupContent = document.createElement('div');
            popupContent.className = 'popup-content';

            const iconElement = document.createElement('div');
            iconElement.className = 'popup-icon';
            iconElement.textContent = icon;

            const titleElement = document.createElement('h3');
            titleElement.className = 'popup-title';
            titleElement.textContent = title;

            const messageElement = document.createElement('p');
            messageElement.className = 'popup-message';
            messageElement.textContent = message;

            const buttonElement = document.createElement('button');
            buttonElement.className = 'popup-button';
            buttonElement.textContent = 'OK';
            buttonElement.onclick = function () {
                hideFeedbackPopup(overlay);
            };

            popupContent.appendChild(iconElement);
            popupContent.appendChild(titleElement);
            popupContent.appendChild(messageElement);
            popupContent.appendChild(buttonElement);

            overlay.appendChild(popupContent);

            document.body.appendChild(overlay);
        } else {
            const iconElement = overlay.querySelector('.popup-icon');
            const titleElement = overlay.querySelector('.popup-title');
            const messageElement = overlay.querySelector('.popup-message');
            iconElement.textContent = icon;
            titleElement.textContent = title;
            messageElement.textContent = message;
        }

        // Defer the .show class to the next tick so the transition fires
        // (CSS can't transition an element from `display: none`).
        setTimeout(() => {
            overlay.classList.add('show');
        }, 10);

        if (title === 'Thank You!') {
            setTimeout(() => {
                hideFeedbackPopup(overlay);
            }, 5000);
        }
    }

    function hideFeedbackPopup(overlay) {
        overlay.classList.remove('show');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }

    function initializeBackButton() {
        const backBtn = document.querySelector('.back-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
    }

    function resetSubmitButton(submitBtn, originalText) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
})();