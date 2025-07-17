import React, { useState, useEffect } from 'react';

const VoteSystem = ({ postId, initialScore = 0, initialUserVote = '', isAuthenticated = false }) => {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to get CSRF token from multiple sources (cookie, meta tag)
  const getCSRFToken = () => {
    // Method 1: From meta tag (often used in Django templates)
    const metaToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (metaToken) return metaToken;

    // Method 2: From cookie
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken' + '=')) {
          cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // The initializeCSRF function is attempting to fetch a new CSRF token if one isn't found.
  // This is a good approach. Ensure your /csrf/ endpoint actually sets the csrftoken cookie.
  const initializeCSRF = async () => {
    try {
      // It's good to make a GET request to an endpoint that forces CSRF cookie creation.
      // Django's `ensure_csrf_cookie` decorator on a simple GET view can achieve this.
      const response = await fetch('/csrf/', { 
        method: 'GET',
        credentials: 'include', // Important to send/receive cookies
      });
      
      if (response.ok) {
        // After the request, the cookie should be set by the server.
        return getCSRFToken(); // Try to get it again after the fetch.
      }
    } catch (error) {
      console.warn('Could not initialize CSRF token:', error);
    }
    return null;
  };

  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      alert('Please login to vote!');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    
    try {
      let csrfToken = getCSRFToken(); // First, try to get the existing token

      // If no token is found, attempt to initialize it.
      if (!csrfToken) {
        console.warn("CSRF token not found, attempting to initialize...");
        csrfToken = await initializeCSRF();
      }

      if (!csrfToken) {
        throw new Error('Could not obtain CSRF token. Please refresh the page.'); // More user-friendly
      }

      const formData = new FormData();
      formData.append('post_id', postId);
      formData.append('vote_type', voteType);
      // It's good to send in both header and form data for maximum compatibility with Django
      formData.append('csrfmiddlewaretoken', csrfToken); 

      const response = await fetch('/vote/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken, // Sending in header
          'X-Requested-With': 'XMLHttpRequest', // Often used by Django for AJAX checks
        },
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        // Centralized error handling based on status codes
        if (response.status === 403) {
            // Specific message for 403, indicating CSRF or session issue
            throw new Error('Authentication failed. Your session might have expired or the security token is invalid. Please refresh the page and try again.');
        } else if (response.status === 401) {
            // Specific message for 401 Unauthorized
            throw new Error('You are not authorized. Please log in again.');
        }
        throw new Error(`Server error: HTTP ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned an unexpected response format. Please try again.');
      }

      const data = await response.json();

      if (data.success) {
        setScore(data.score);
        setUserVote(data.action === 'removed' ? '' : voteType);
      } else {
        // Backend sent success: false with an error message
        throw new Error(data.error || 'Vote operation failed.');
      }

    } catch (error) {
      console.error('Vote error:', error);
      // More specific alerts to the user
      if (error.message.includes('CSRF') || error.message.includes('token invalid') || error.message.includes('session expired')) {
        alert('Security check failed or session expired. Please refresh the page and try again.');
      } else if (error.message.includes('Authentication failed') || error.message.includes('log in again')) {
        alert('Authentication required. Please log in again.');
        // Optionally redirect to login page
        // window.location.href = '/login'; 
      } else {
        alert(`An error occurred while voting: ${error.message}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial vote state - this is for fetching the user's *previous* vote for this post.
  // This is separate from authentication and CSRF.
  useEffect(() => {
    // Only attempt to load user vote if authenticated and postId is available
    if (isAuthenticated && postId) { 
      loadUserVote();
    }
  }, [postId, isAuthenticated]); // Dependency array includes isAuthenticated to re-run if auth state changes

  const loadUserVote = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/user_vote/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest', // Important for Django's is_ajax() check
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserVote(data.user_vote || '');
      } else {
        console.warn(`Failed to load user vote: HTTP ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Could not load user vote:', error);
    }
  };

  return (
    <div className="vote-section">
      <button
        className={`vote-btn upvote ${userVote === 'up' ? 'active voted-up' : ''}`}
        onClick={() => handleVote('up')}
        disabled={isLoading || !isAuthenticated} // Disable if loading or not authenticated
        title={!isAuthenticated ? 'Login to vote' : ''} // Tooltip if not authenticated
      >
        {isLoading && userVote === 'up' ? '...' : '↑'}
      </button>
      
      <span className={`score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
        {score}
      </span>
      
      <button
        className={`vote-btn downvote ${userVote === 'down' ? 'active voted-down' : ''}`}
        onClick={() => handleVote('down')}
        disabled={isLoading || !isAuthenticated} // Disable if loading or not authenticated
        title={!isAuthenticated ? 'Login to vote' : ''} // Tooltip if not authenticated
      >
        {isLoading && userVote === 'down' ? '...' : '↓'}
      </button>
    </div>
  );
};

export default VoteSystem;