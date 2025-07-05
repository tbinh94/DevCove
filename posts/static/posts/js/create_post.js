// Create Post JavaScript Functionality
(function() {
    'use strict';

    // DOM Elements
    const tabs = document.querySelectorAll('.post-type-tab');
    const form = document.querySelector('.post-form');
    const submitBtn = document.getElementById('submitBtn');
    const postPreview = document.getElementById('postPreview');
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');
    const imageInput = document.getElementById('image');
    const textareas = document.querySelectorAll('textarea');

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initTabFunctionality();
        initPreviewFunctionality();
        initFileUpload();
        initFormSubmission();
        initTextareaResize();
    });

    /**
     * Initialize tab functionality
     */
    function initTabFunctionality() {
        tabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
    }

    /**
     * Handle tab click events
     */
    function handleTabClick(e) {
        const clickedTab = e.target;
        const tabType = clickedTab.dataset.type;

        // Remove active class from all tabs
        tabs.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');

        // Handle content visibility based on tab type
        handleContentVisibility(tabType);
    }

    /**
     * Handle content visibility based on tab type
     */
    function handleContentVisibility(type) {
        // Hide all content types initially
        const contentSections = ['textContent', 'imageContent', 'linkContent'];
        contentSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Show selected content type
        const targetSection = document.getElementById(type + 'Content');
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // Update form behavior based on tab type
        updateFormBehavior(type);
    }

    /**
     * Update form behavior based on selected tab
     */
    function updateFormBehavior(type) {
        const imageField = document.querySelector('[name="image"]');
        const contentField = document.querySelector('[name="content"]');
        
        // Adjust field requirements based on post type
        switch(type) {
            case 'image':
                if (imageField) imageField.required = true;
                break;
            case 'text':
                if (contentField) contentField.required = true;
                break;
            case 'link':
                // Handle link-specific requirements
                break;
            case 'poll':
                // Handle poll-specific requirements
                break;
        }
    }

    /**
     * Initialize preview functionality
     */
    function initPreviewFunctionality() {
        if (form) {
            form.addEventListener('input', debounce(updatePreview, 300));
        }
    }

    /**
     * Update post preview
     */
    function updatePreview() {
        const titleInput = form.querySelector('input[name*="title"], input[id*="title"]');
        const contentInput = form.querySelector('textarea[name="content"]');
        
        if (!titleInput || !previewTitle || !previewContent) return;

        const title = titleInput.value.trim();
        const content = contentInput ? contentInput.value.trim() : '';
        
        if (title) {
            previewTitle.textContent = title;
            previewContent.textContent = content || 'No additional text';
            
            if (postPreview) {
                postPreview.style.display = 'block';
            }
        } else {
            if (postPreview) {
                postPreview.style.display = 'none';
            }
        }
    }

    /**
     * Initialize file upload functionality
     */
    function initFileUpload() {
        if (!imageInput) return;

        imageInput.addEventListener('change', handleFileSelection);
    }

    /**
     * Handle file selection
     */
    function handleFileSelection(e) {
        const files = e.target.files;
        const fileLabel = document.querySelector('.file-upload-label');
        
        if (files.length > 0) {
            if (fileLabel) {
                fileLabel.innerHTML = `📁 ${files.length} file(s) selected`;
            }
            
            // Validate file types and sizes
            validateFiles(files);
        } else {
            if (fileLabel) {
                fileLabel.innerHTML = '📁 Choose Files';
            }
        }
    }

    /**
     * Validate selected files
     */
    function validateFiles(files) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        for (let file of files) {
            if (file.size > maxSize) {
                showError(`File "${file.name}" is too large. Maximum size is 10MB.`);
                return false;
            }
            
            if (!allowedTypes.includes(file.type)) {
                showError(`File "${file.name}" is not a supported image type.`);
                return false;
            }
        }
        
        return true;
    }

    /**
     * Initialize form submission
     */
    function initFormSubmission() {
        if (!form) return;

        form.addEventListener('submit', handleFormSubmission);
    }

    /**
     * Handle form submission
     */
    function handleFormSubmission(e) {
        if (!validateForm()) {
            e.preventDefault();
            return false;
        }

        if (submitBtn) {
            submitBtn.textContent = 'Posting...';
            submitBtn.disabled = true;
        }

        // Show loading state
        showLoadingState();
    }

    /**
     * Validate form before submission
     */
    function validateForm() {
        const titleInput = form.querySelector('input[name*="title"]');
        
        if (!titleInput || !titleInput.value.trim()) {
            showError('Title is required');
            if (titleInput) titleInput.focus();
            return false;
        }

        if (titleInput.value.length > 300) {
            showError('Title must be less than 300 characters');
            titleInput.focus();
            return false;
        }

        return true;
    }

    /**
     * Initialize textarea auto-resize
     */
    function initTextareaResize() {
        textareas.forEach(textarea => {
            textarea.addEventListener('input', handleTextareaResize);
            
            // Set initial height
            handleTextareaResize.call(textarea);
        });
    }

    /**
     * Handle textarea resize
     */
    function handleTextareaResize() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 400) + 'px';
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Creating your post...</p>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    }

    /**
     * Show error message
     */
    function showError(message) {
        // Create or update error message element
        let errorElement = document.getElementById('form-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'form-error';
            errorElement.className = 'alert alert-danger';
            errorElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #f8d7da;
                color: #721c24;
                padding: 12px 16px;
                border-radius: 4px;
                border: 1px solid #f5c6cb;
                z-index: 1000;
                max-width: 400px;
            `;
            document.body.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, 5000);
    }

    /**
     * Debounce function to limit function calls
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        const successElement = document.createElement('div');
        successElement.className = 'alert alert-success';
        successElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #d4edda;
            color: #155724;
            padding: 12px 16px;
            border-radius: 4px;
            border: 1px solid #c3e6cb;
            z-index: 1000;
            max-width: 400px;
        `;
        successElement.textContent = message;
        document.body.appendChild(successElement);
        
        setTimeout(() => {
            successElement.remove();
        }, 5000);
    }

    /**
     * Handle keyboard shortcuts
     */
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Export functions for external use if needed
    window.CreatePost = {
        updatePreview,
        showError,
        showSuccess,
        validateForm
    };

})();