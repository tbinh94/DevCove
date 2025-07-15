// services/api.js - Improved version with better CSRF and vote handling
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  constructor() {
    this.baseURL = BASE_URL;
    this.csrfToken = null;
  }

  // Multiple methods to get CSRF token
  getCSRFToken() {
    // Method 1: From meta tag (most reliable for Django)
    const metaToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (metaToken) return metaToken;

    // Method 2: From cookie
    const cookieToken = this.getCookie('csrftoken');
    if (cookieToken) return cookieToken;

    // Method 3: From stored token
    return this.csrfToken;
  }

  // Get cookie value
  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // Initialize CSRF token
  async initCSRF() {
    try {
      const response = await fetch(`${this.baseURL}/csrf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        // After calling /csrf/, the token should be in the cookie
        const csrfToken = this.getCookie('csrftoken');
        if (csrfToken) {
          this.csrfToken = csrfToken;
          return csrfToken;
        }
      }
    } catch (error) {
      console.warn('CSRF token fetch failed:', error);
    }
    
    return null;
  }

  // Get default headers
  getHeaders(includeCSRF = true, contentType = 'application/json') {
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    if (includeCSRF) {
      const csrfToken = this.getCSRFToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }
    
    return headers;
  }

  // Generic API request method with better error handling
  async request(url, options = {}) {
    // Ensure CSRF token is available for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method)) {
      if (!this.getCSRFToken()) {
        await this.initCSRF();
      }
    }

    const config = {
      credentials: 'include',
      ...options,
    };

    // Set headers if not already set
    if (!config.headers) {
      config.headers = this.getHeaders();
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      
      // Handle different response types
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          // Use original error message if parsing fails
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Vote method using FormData (Django-style)
  async vote(postId, voteType) {
    // make sure CSRF is initialized
    let csrfToken = this.getCSRFToken();
    if (!csrfToken) {
      csrfToken = await this.initCSRF();
      if (!csrfToken) throw new Error('Could not get CSRF token');
    }

    const url = `/api/posts/${postId}/vote/`;      // ← correct endpoint
    const body = JSON.stringify({ vote_type: voteType });

    const res = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': csrfToken,
      },
      body,
    });

    if (!res.ok) {
      if (res.status === 403) throw new Error('Authentication failed. Please log in again.');
      const txt = await res.text();
      throw new Error(`Vote failed: ${res.status} ${txt}`);
    }

    return await res.json();
  }

  // Alternative vote method using JSON (if your Django view supports it)
  async voteJSON(postId, voteType) {
    return await this.request('/api/vote/', {
      method: 'POST',
      headers: this.getHeaders(true, 'application/json'),
      body: JSON.stringify({
        post_id: postId,
        vote_type: voteType,
      }),
    });
  }

  // Get user's vote for a post
  async getUserVote(postId) {
    try {
      return await this.request(`/api/posts/${postId}/user_vote/`);
    } catch (error) {
      if (error.message.includes('404')) {
        return { user_vote: null };
      }
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.request('/api/auth/login/', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(credentials),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async register(userData) {
    try {
      const response = await this.request('/api/auth/register/', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout() {
    try {
      const response = await this.request('/api/auth/logout/', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });
      
      this.csrfToken = null;
      return response;
    } catch (error) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  async checkAuth() {
    try {
      const response = await this.request('/api/auth/user/', {
        method: 'GET',
        headers: this.getHeaders(false), // No CSRF needed for GET
      });
      return response;
    } catch (error) {
      return {
        isAuthenticated: false,
        user: null,
      };
    }
  }

  // Posts methods
  async getPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/posts/?${queryString}` : '/api/posts/';
    return await this.request(url, {
      headers: this.getHeaders(false),
    });
  }

  async getPost(id) {
    return await this.request(`/api/posts/${id}/`, {
      headers: this.getHeaders(false),
    });
  }

  async createPost(postData) {
    const isForm = postData instanceof FormData;
    
    // Ensure CSRF token is available
    let csrfToken = this.getCSRFToken();
    if (!csrfToken) {
      csrfToken = await this.initCSRF();
      if (!csrfToken) {
        throw new Error('Could not get CSRF token');
      }
    }

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrfToken,
    };

    // Only set JSON content type if it's not FormData
    if (!isForm) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${this.baseURL}/api/posts/`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: isForm ? postData : JSON.stringify(postData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch (parseError) {
          // Use original error message if parsing fails
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Create post error:', error);
      throw error;
    }
  }

  async updatePost(id, postData) {
    return await this.request(`/api/posts/${id}/`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(postData),
    });
  }

  async deletePost(id) {
    return await this.request(`/api/posts/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  // Comments methods
  async getComments(postId) {
    return await this.request(`/api/comments/?post=${postId}`, {
      headers: this.getHeaders(false),
    });
  }
  async getCommentsForPost(postId) {
    return await this.request(`/api/posts/${postId}/comments/`, {
      headers: this.getHeaders(false),
    });
  }
  async createComment(commentData) {
    return await this.request('/api/comments/', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(commentData),
    });
  }

  async updateComment(id, commentData) {
    return await this.request(`/api/comments/${id}/`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(commentData),
    });
  }

  async deleteComment(id) {
    return await this.request(`/api/comments/${id}/`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  // Utility methods
  get utils() {
    return {
      initCSRF: () => this.initCSRF(),
      getCSRFToken: () => this.getCSRFToken(),
      setCSRFToken: (token) => { this.csrfToken = token; },
    };
  }
}

// Create and export a singleton instance
const apiService = new APIService();
export default apiService;