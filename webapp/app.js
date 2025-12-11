/**
 * SERP Aggregator - Frontend Application
 * UI for Google SERP API aggregation
 */

// DOM Elements
const queryInput = document.getElementById('query-input');
const maxPagesInput = document.getElementById('max-pages');
const concurrencyInput = document.getElementById('concurrency');
const countrySelect = document.getElementById('country');
const languageSelect = document.getElementById('language');
const searchBtn = document.getElementById('search-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const resultsContainer = document.getElementById('results-container');
const resultsStats = document.getElementById('results-stats');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabOrganic = document.getElementById('tab-organic');
const tabRelated = document.getElementById('tab-related');
const tabPaa = document.getElementById('tab-paa');
const tabRaw = document.getElementById('tab-raw');

// State
let lastResults = null;
let lastQuery = '';

// API Base URL (change this to your backend server)
const API_BASE_URL = 'http://localhost:8000';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Search button click
    searchBtn.addEventListener('click', startSearch);

    // Query input enter key
    queryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startSearch();
        }
    });

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId);
        });
    });

    // Copy button
    copyBtn.addEventListener('click', copyToClipboard);

    // Download button
    downloadBtn.addEventListener('click', downloadJSON);

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

/**
 * Switch active tab
 */
function switchTab(tabId) {
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

/**
 * Show/hide loading state
 */
function setLoading(isLoading) {
    const btnText = searchBtn.querySelector('.btn-text');
    const btnLoader = searchBtn.querySelector('.btn-loader');

    searchBtn.disabled = isLoading;
    btnText.style.display = isLoading ? 'none' : 'inline';
    btnLoader.style.display = isLoading ? 'flex' : 'none';
}

/**
 * Update progress bar
 */
function updateProgress(percent, text) {
    progressContainer.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
}

/**
 * Show error message
 */
function showError(message) {
    errorContainer.style.display = 'block';
    errorMessage.textContent = message;
    resultsContainer.style.display = 'none';
}

/**
 * Hide error message
 */
function hideError() {
    errorContainer.style.display = 'none';
}

/**
 * Format organic results
 */
function renderOrganicResults(organic) {
    if (!organic || organic.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>No organic results found</p>
        </div>`;
    }

    return organic.map((item, index) => `
        <div class="organic-item">
            <div class="organic-title">
                <span class="organic-rank">${item.best_position || index + 1}</span>
                <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">
                    ${escapeHtml(item.title || 'Untitled')}
                </a>
            </div>
            <div class="organic-link">${escapeHtml(item.link)}</div>
            ${item.description ? `<div class="organic-description">${escapeHtml(item.description)}</div>` : ''}
            <div class="organic-meta">
                ${item.best_position ? `<span class="meta-badge best">📍 Best: #${item.best_position}</span>` : ''}
                ${item.frequency ? `<span class="meta-badge freq">🔄 Seen: ${item.frequency}x</span>` : ''}
                ${item.avg_position ? `<span class="meta-badge">📊 Avg: #${item.avg_position}</span>` : ''}
                ${item.pages_seen ? `<span class="meta-badge">📄 Pages: ${item.pages_seen.join(', ')}</span>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Format related searches
 */
function renderRelatedSearches(related) {
    if (!related || related.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>No related searches found</p>
        </div>`;
    }

    return related.map(item => {
        const text = typeof item === 'string' ? item : item.text;
        const link = typeof item === 'string' ? '#' : item.link;
        return `<a href="${escapeHtml(link)}" class="related-item" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
    }).join('');
}

/**
 * Format People Also Ask
 */
function renderPeopleAlsoAsk(paa) {
    if (!paa || paa.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">❓</div>
            <p>No "People Also Ask" found</p>
        </div>`;
    }

    return paa.map(item => {
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        return `<div class="paa-item">${escapeHtml(text)}</div>`;
    }).join('');
}

/**
 * Show results
 */
function showResults(data) {
    resultsContainer.style.display = 'block';
    lastResults = data;

    // Calculate stats
    const organicCount = data.organic?.length || 0;
    const relatedCount = data.related?.length || 0;
    const paaCount = data.people_also_ask?.length || 0;

    // Render stats
    resultsStats.innerHTML = `
        <div class="stat-item">
            <div class="stat-value">${organicCount}</div>
            <div class="stat-label">Organic Results</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${relatedCount}</div>
            <div class="stat-label">Related Searches</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${paaCount}</div>
            <div class="stat-label">People Also Ask</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${data.general?.query || lastQuery}</div>
            <div class="stat-label">Query</div>
        </div>
    `;

    // Render tab content
    tabOrganic.innerHTML = renderOrganicResults(data.organic);
    tabRelated.innerHTML = renderRelatedSearches(data.related);
    tabPaa.innerHTML = renderPeopleAlsoAsk(data.people_also_ask);
    tabRaw.innerHTML = `<pre class="raw-json">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;

    // Show organic tab by default
    switchTab('organic');
}

/**
 * Escape HTML characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Copy JSON to clipboard
 */
async function copyToClipboard() {
    if (!lastResults) return;

    try {
        await navigator.clipboard.writeText(JSON.stringify(lastResults, null, 2));

        // Visual feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓';
        copyBtn.style.background = 'rgba(16, 185, 129, 0.3)';

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.style.background = '';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

/**
 * Download JSON file
 */
function downloadJSON() {
    if (!lastResults) return;

    const filename = `serp-${lastQuery.replace(/\s+/g, '-')}-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(lastResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Main search function
 */
async function startSearch() {
    const query = queryInput.value.trim();
    const maxPages = parseInt(maxPagesInput.value) || 5;
    const concurrency = parseInt(concurrencyInput.value) || 10;
    const country = countrySelect.value;
    const language = languageSelect.value;

    // Validate
    if (!query) {
        showError('Please enter a search query');
        return;
    }

    lastQuery = query;

    // Reset UI
    hideError();
    resultsContainer.style.display = 'none';
    setLoading(true);
    updateProgress(10, 'Initializing search...');

    try {
        updateProgress(30, 'Connecting to SERP API...');

        // Try to connect to backend API
        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                max_pages: maxPages,
                concurrency,
                country,
                language
            })
        });

        updateProgress(70, 'Processing results...');

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        updateProgress(100, 'Complete!');

        setTimeout(() => {
            progressContainer.style.display = 'none';
            showResults(data);
            setLoading(false);
        }, 500);

    } catch (error) {
        console.error('Search error:', error);

        // If backend not available, show demo data
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            updateProgress(50, 'Backend not available, loading demo data...');

            setTimeout(() => {
                const demoData = generateDemoData(query);
                updateProgress(100, 'Demo data loaded!');

                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    showResults(demoData);
                    setLoading(false);
                }, 500);
            }, 1000);
        } else {
            progressContainer.style.display = 'none';
            showError(error.message || 'Failed to perform search. Please try again.');
            setLoading(false);
        }
    }
}

/**
 * Generate demo data when backend is not available
 */
function generateDemoData(query) {
    return {
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        keyword: null,
        general: {
            query: query,
            search_engine: 'google',
            search_type: 'text',
            language: 'en',
            timestamp: new Date().toISOString()
        },
        organic: [
            {
                link: 'https://example.com/result-1',
                rank: 1,
                title: `${query} - Complete Guide`,
                description: `Learn everything about ${query} in this comprehensive guide. Covers basics to advanced topics.`,
                best_position: 1,
                avg_position: 1.5,
                frequency: 3,
                pages_seen: [1, 2, 3]
            },
            {
                link: 'https://example.com/result-2',
                rank: 2,
                title: `Understanding ${query} - Tutorial`,
                description: `A step-by-step tutorial on ${query} for beginners and experts alike.`,
                best_position: 2,
                avg_position: 2.3,
                frequency: 2,
                pages_seen: [1, 3]
            },
            {
                link: 'https://example.com/result-3',
                rank: 3,
                title: `${query} Best Practices`,
                description: `Industry best practices and recommendations for ${query}.`,
                best_position: 3,
                avg_position: 4.0,
                frequency: 2,
                pages_seen: [1, 5]
            },
            {
                link: 'https://wikipedia.org/wiki/example',
                rank: 4,
                title: `${query} - Wikipedia`,
                description: `Wikipedia article about ${query} with detailed information and references.`,
                best_position: 4,
                avg_position: 4.5,
                frequency: 1,
                pages_seen: [1]
            },
            {
                link: 'https://example.com/result-5',
                rank: 5,
                title: `Top 10 ${query} Resources`,
                description: `Curated list of the best resources for learning ${query}.`,
                best_position: 5,
                avg_position: 6.0,
                frequency: 1,
                pages_seen: [2]
            }
        ],
        related: [
            { text: `${query} tutorial`, link: '#', rank: 1 },
            { text: `${query} for beginners`, link: '#', rank: 2 },
            { text: `${query} examples`, link: '#', rank: 3 },
            { text: `best ${query} tools`, link: '#', rank: 4 },
            { text: `${query} vs alternatives`, link: '#', rank: 5 }
        ],
        people_also_ask: [
            `What is ${query}?`,
            `How do I learn ${query}?`,
            `Why is ${query} important?`,
            `What are the benefits of ${query}?`
        ],
        navigation: [
            { title: 'Images', href: '#' },
            { title: 'Videos', href: '#' },
            { title: 'News', href: '#' }
        ],
        pagination: [],
        aio_text: null,
        language: null,
        country: null,
        _demo: true,
        _message: 'This is demo data. Start the backend server to get real search results.'
    };
}

// Console message
console.log(`
🔍 SERP Aggregator v1.0
━━━━━━━━━━━━━━━━━━━━━━
Google SERP API Aggregator

Features:
- Multi-page search results
- Smart deduplication
- Export to JSON

To use real data, start the backend:
  cd src && python server.py

Happy searching! 🚀
`);
