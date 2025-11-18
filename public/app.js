// ===================================
// Application State & Constants
// ===================================
const API_BASE = '/api';
let currentSecret = null;

// ===================================
// DOM Elements
// ===================================
const elements = {
    // Views
    viewCreate: document.getElementById('view-create'),
    viewResult: document.getElementById('view-result'),
    viewRead: document.getElementById('view-read'),
    viewError: document.getElementById('view-error'),
    loading: document.getElementById('loading'),

    // Create view
    secretInput: document.getElementById('secret-input'),
    charCount: document.getElementById('char-count'),
    createBtn: document.getElementById('create-btn'),

    // Result view
    resultLink: document.getElementById('result-link'),
    copyBtn: document.getElementById('copy-btn'),
    expirationText: document.getElementById('expiration-text'),
    createAnotherBtn: document.getElementById('create-another-btn'),

    // Read view
    secretContent: document.getElementById('secret-content'),
    copySecretBtn: document.getElementById('copy-secret-btn'),
    goHomeBtn: document.getElementById('go-home-btn'),

    // Error view
    errorHomeBtn: document.getElementById('error-home-btn'),
};

// ===================================
// View Management
// ===================================
function showView(viewName) {
    // Hide all views
    Object.values(elements).forEach(el => {
        if (el && el.classList && el.classList.contains('view')) {
            el.classList.remove('active');
        }
    });

    // Show requested view
    const viewMap = {
        'create': elements.viewCreate,
        'result': elements.viewResult,
        'read': elements.viewRead,
        'error': elements.viewError,
    };

    if (viewMap[viewName]) {
        viewMap[viewName].classList.add('active');
    }

    // Update URL without page reload
    if (viewName === 'create') {
        window.history.pushState({}, '', '/');
    }
}

function showLoading(show = true) {
    if (show) {
        elements.loading.classList.remove('hidden');
    } else {
        elements.loading.classList.add('hidden');
    }
}

// ===================================
// API Functions
// ===================================
async function createSecret(content) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/secrets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to create secret');
        }

        return data;
    } catch (error) {
        console.error('Create secret error:', error);
        alert(`Error: ${error.message}`);
        return null;
    } finally {
        showLoading(false);
    }
}

async function retrieveSecret(id) {
    showLoading(true);
    try {
        const response = await fetch(`${API_BASE}/secrets/${id}`);
        const data = await response.json();

        if (!response.ok) {
            return { error: data.error || 'Secret not found' };
        }

        return data;
    } catch (error) {
        console.error('Retrieve secret error:', error);
        return { error: 'Failed to retrieve secret' };
    } finally {
        showLoading(false);
    }
}

// ===================================
// Event Handlers
// ===================================

// Character counter for textarea
elements.secretInput.addEventListener('input', (e) => {
    const length = e.target.value.length;
    elements.charCount.textContent = length.toLocaleString();

    // Update button state
    elements.createBtn.disabled = length === 0;
});

// Create secret
elements.createBtn.addEventListener('click', async () => {
    const content = elements.secretInput.value.trim();

    if (!content) {
        alert('Please enter some content to share');
        return;
    }

    const result = await createSecret(content);

    if (result) {
        // Display result
        elements.resultLink.value = result.url;
        elements.expirationText.textContent = `Expires ${result.expiresIn || 'in 24 hours'}`;

        // Clear input
        elements.secretInput.value = '';
        elements.charCount.textContent = '0';
        elements.createBtn.disabled = true;

        // Show result view
        showView('result');
    }
});

// Copy link to clipboard
elements.copyBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(elements.resultLink.value);

        // Visual feedback
        const originalText = elements.copyBtn.innerHTML;
        elements.copyBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        elements.copyBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        setTimeout(() => {
            elements.copyBtn.innerHTML = originalText;
            elements.copyBtn.style.background = '';
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard');
    }
});

// Copy secret content to clipboard
elements.copySecretBtn.addEventListener('click', async () => {
    try {
        const content = elements.secretContent.textContent;
        await navigator.clipboard.writeText(content);

        // Visual feedback
        const originalText = elements.copySecretBtn.innerHTML;
        elements.copySecretBtn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
        elements.copySecretBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

        setTimeout(() => {
            elements.copySecretBtn.innerHTML = originalText;
            elements.copySecretBtn.style.background = '';
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard');
    }
});

// Navigation buttons
elements.createAnotherBtn.addEventListener('click', () => {
    showView('create');
});

elements.goHomeBtn.addEventListener('click', () => {
    showView('create');
});

elements.errorHomeBtn.addEventListener('click', () => {
    showView('create');
});

// ===================================
// URL Routing & Secret Retrieval
// ===================================
async function handleRouting() {
    const urlParams = new URLSearchParams(window.location.search);
    const secretId = urlParams.get('secret');

    if (secretId) {
        // Retrieve and display secret
        const result = await retrieveSecret(secretId);

        if (result.error) {
            showView('error');
        } else {
            elements.secretContent.textContent = result.content;
            currentSecret = result.content;
            showView('read');
        }
    } else {
        // Show create view by default
        showView('create');
    }
}

// ===================================
// Keyboard Shortcuts
// ===================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to create secret
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (elements.viewCreate.classList.contains('active') && !elements.createBtn.disabled) {
            elements.createBtn.click();
        }
    }

    // Escape to go back to create view
    if (e.key === 'Escape') {
        if (!elements.viewCreate.classList.contains('active')) {
            showView('create');
        }
    }
});

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initial routing
    handleRouting();

    // Handle browser back/forward
    window.addEventListener('popstate', handleRouting);

    // Focus on textarea on load
    if (elements.viewCreate.classList.contains('active')) {
        elements.secretInput.focus();
    }
});

// ===================================
// Auto-select link on focus
// ===================================
elements.resultLink.addEventListener('focus', (e) => {
    e.target.select();
});

elements.resultLink.addEventListener('click', (e) => {
    e.target.select();
});
