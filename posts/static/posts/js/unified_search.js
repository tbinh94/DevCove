// Enhanced unified search with better UX
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    const searchTypeSelector = document.getElementById('searchTypeSelector');
    const searchTypeText = document.getElementById('searchTypeText');
    const searchForm = document.getElementById('searchForm');
    
    let currentSearchType = 'posts';
    let searchTimeout;
    let currentQuery = '';
    let isSearching = false;
    
    // Search type toggle
    searchTypeSelector.addEventListener('click', function() {
        currentSearchType = currentSearchType === 'posts' ? 'users' : 'posts';
        searchTypeText.textContent = currentSearchType === 'posts' ? 'Posts' : 'Users';
        searchInput.placeholder = currentSearchType === 'posts' ? 'Search posts...' : 'Search users...';
        
        if (searchInput.value.trim()) {
            performSearch(searchInput.value);
        }
    });
    
    // Real-time search with debouncing
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        currentQuery = query;
        
        clearTimeout(searchTimeout);
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                if (currentQuery === query) { // Prevent race conditions
                    performSearch(query);
                }
            }, 300);
        } else {
            hideDropdown();
        }
    });
    
    // Form submission
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        
        if (query) {
            if (currentSearchType === 'posts') {
                window.location.href = `/posts/?q=${encodeURIComponent(query)}`;
            } else {
                window.location.href = `/users/search/?q=${encodeURIComponent(query)}`;
            }
        }
    });
    
    // Perform search with loading state
    function performSearch(query) {
        if (isSearching) return;
        
        isSearching = true;
        showLoading();
        
        fetch(`/api/search/?q=${encodeURIComponent(query)}&type=${currentSearchType}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (currentQuery === query) { // Only update if this is still the current query
                updateSearchResults(data, query);
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            showError('Search failed. Please try again.');
        })
        .finally(() => {
            isSearching = false;
        });
    }
    
    // Show loading state
    function showLoading() {
        searchDropdown.innerHTML = '<div class="search-loading">🔍 Searching...</div>';
        showDropdown();
    }
    
    // Show error message
    function showError(message) {
        searchDropdown.innerHTML = `<div class="search-error">❌ ${message}</div>`;
        showDropdown();
    }
    
    // Update search results with enhanced display
    function updateSearchResults(data, query) {
        let html = '';
        
        if (data.posts.length > 0) {
            html += '<div class="search-category">📝 Posts</div>';
            data.posts.forEach(post => {
                const snippet = post.content_snippet || '';
                const highlightedTitle = highlightText(post.title, query);
                const highlightedSnippet = highlightText(snippet, query);
                
                html += `
                    <div class="search-result" onclick="window.location.href='${post.url}'">
                        <div class="result-title">
                            <span class="result-icon">📝</span>
                            ${highlightedTitle}
                        </div>
                        ${snippet ? `<div class="result-snippet">${highlightedSnippet}</div>` : ''}
                        <div class="result-meta">
                            <span class="result-author">by u/${post.author}</span>
                            <span class="result-date">${post.created_at}</span>
                            ${post.community ? `<span class="result-community">in r/${post.community}</span>` : ''}
                            ${post.vote_score !== undefined ? `<span class="result-score">↑${post.vote_score}</span>` : ''}
                            ${post.comment_count !== undefined ? `<span class="result-comments">💬${post.comment_count}</span>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        if (data.users.length > 0) {
            html += '<div class="search-category">👤 Users</div>';
            data.users.forEach(user => {
                const highlightedUsername = highlightText(user.username, query);
                
                html += `
                    <div class="search-result" onclick="window.location.href='${user.url}'">
                        <div class="result-title">
                            <span class="result-icon">👤</span>
                            u/${highlightedUsername}
                        </div>
                        <div class="result-meta">
                            <span class="result-karma">Karma: ${user.karma}</span>
                            <span class="result-joined">Joined: ${user.joined}</span>
                            ${user.post_count !== undefined ? `<span class="result-posts">Posts: ${user.post_count}</span>` : ''}
                        </div>
                    </div>
                `;
            });
        }
        
        if (html === '') {
            html = `
                <div class="search-no-results">
                    <div class="no-results-icon">🔍</div>
                    <div class="no-results-text">No results found for "${query}"</div>
                    <div class="no-results-suggestion">Try different keywords or check spelling</div>
                </div>
            `;
        }
        
        // Add "View all results" link
        if (data.posts.length > 0 || data.users.length > 0) {
            html += `
                <div class="search-footer">
                    <a href="${currentSearchType === 'posts' ? '/posts/' : '/users/search/'}?q=${encodeURIComponent(query)}" 
                       class="view-all-results">
                        View all results for "${query}" →
                    </a>
                </div>
            `;
        }
        
        searchDropdown.innerHTML = html;
        showDropdown();
    }
    
    // Simple text highlighting function
    function highlightText(text, query) {
        if (!query || !text) return text;
        
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    // Escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    function showDropdown() {
        searchDropdown.classList.add('show');
    }
    
    function hideDropdown() {
        searchDropdown.classList.remove('show');
    }
    
    // Keyboard navigation
    let selectedIndex = -1;
    
    searchInput.addEventListener('keydown', function(e) {
        const results = searchDropdown.querySelectorAll('.search-result');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                updateSelection(results);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                updateSelection(results);
                break;
            case 'Enter':
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    e.preventDefault();
                    results[selectedIndex].click();
                }
                break;
            case 'Escape':
                hideDropdown();
                selectedIndex = -1;
                break;
        }
    });
    
    function updateSelection(results) {
        results.forEach((result, index) => {
            result.classList.toggle('selected', index === selectedIndex);
        });
    }
    
    // Handle focus/blur and outside clicks
    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            showDropdown();
        }
    });
    
    searchInput.addEventListener('blur', function() {
        setTimeout(() => {
            hideDropdown();
            selectedIndex = -1;
        }, 200);
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.unified-search')) {
            hideDropdown();
            selectedIndex = -1;
        }
    });
});