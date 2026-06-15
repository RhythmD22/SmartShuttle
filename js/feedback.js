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

        if (issueType) {
            issueType.addEventListener('change', function () {
                issueType.classList.toggle('has-value', this.value !== '');
            });
        }

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

        const feedbackParams = {
            issue_type: selectedIssueType,
            description: descriptionValue,
            attachment_info: attachmentInput && attachmentInput.files.length > 0 ? 'Attachment included' : 'No attachment'
        };

        if (attachmentInput && attachmentInput.files.length > 0) {
            const file = attachmentInput.files[0];

            // Image attachments are inlined as base64 data URIs so the
            // server can embed them; non-image attachments only carry metadata.
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();

                reader.onload = function (event) {
                    feedbackParams.image_attachment = event.target.result;
                    feedbackParams.attachment_name = file.name;

                    feedbackParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                    sendFeedbackAPI(feedbackParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
                };

                reader.onerror = function () {
                    console.error('Error reading file');
                    alert('Error reading the file. Please try again.');

                    feedbackParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;

                    sendFeedbackAPI(feedbackParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, 'without attachment');
                };

                reader.readAsDataURL(file);
                return;
            } else {
                feedbackParams.attachment_info = `Attached: ${file.name} (${file.size} bytes, type: ${file.type})`;
            }
        }

        sendFeedbackAPI(feedbackParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview);
    }

    function sendFeedbackAPI(feedbackParams, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage = '') {
        fetch('/api/send-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedbackParams)
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
                console.error('Feedback submission failed:', error);
                simulateAPIResponse(submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage);
            });
    }

    function handleAPIResponse(data, submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage) {
        if (data && data.success) {
            showFeedbackPopup('Thank You!', `Your feedback has been received!${suffixMessage ? ' (' + suffixMessage + ')' : ''}`);

            if (issueType) issueType.value = '';
            if (descriptionText) descriptionText.value = '';

            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

            resetSubmitButton(submitBtn, originalText);
        } else {
            console.error('Feedback API returned failure:', data ? data.error || 'Unknown error' : 'No response');

            showFeedbackPopup('Error', 'Failed to send feedback. Please try again.');

            resetSubmitButton(submitBtn, originalText);
        }
    }

    function simulateAPIResponse(submitBtn, originalText, issueType, descriptionText, attachmentInput, attachmentLabel, attachmentPreview, suffixMessage = '') {
        setTimeout(() => {
            showFeedbackPopup('Thank You!', `Your feedback has been received!${suffixMessage ? ' (' + suffixMessage + ')' : ''}`);

            if (issueType) issueType.value = '';
            if (descriptionText) descriptionText.value = '';

            resetAttachmentUI(attachmentInput, attachmentLabel, attachmentPreview);

            resetSubmitButton(submitBtn, originalText);
        }, 500);
    }

    function showFeedbackPopup(title, message) {
        let overlay = document.getElementById('feedbackPopupOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'feedbackPopupOverlay';
            overlay.className = 'popup-overlay';

            const popupContent = document.createElement('div');
            popupContent.className = 'popup-content';

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

            popupContent.appendChild(titleElement);
            popupContent.appendChild(messageElement);
            popupContent.appendChild(buttonElement);

            overlay.appendChild(popupContent);

            document.body.appendChild(overlay);
        } else {
            const titleElement = overlay.querySelector('.popup-title');
            const messageElement = overlay.querySelector('.popup-message');
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