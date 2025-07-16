// services/api.js - Fixed version with correct endpoints
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

    const url = `/api/posts/${postId}/vote/`;
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

  // FIXED: Get user profile with correct posts endpoint
  async getUserProfile(username) {
    if (!username) {
      throw new Error('Username is required');
    }

    try {
      // Get user basic info - try different endpoints
      let userResponse;
      try {
        userResponse = await this.request(`/api/users/${username}/`, {
          method: 'GET'
        });
      } catch (error) {
        // Try alternative endpoint
        userResponse = await this.request(`/api/auth/users/${username}/`, {
          method: 'GET'
        });
      }
      
      // Get user's posts - try multiple endpoints
      let posts = [];
      const possibleEndpoints = [
        `/api/posts/?author=${username}`,
        `/api/posts/?author_username=${username}`,
        `/api/users/${username}/posts/`,
        `/api/posts/?user=${username}`,
        `/api/posts/?created_by=${username}`
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying posts endpoint: ${endpoint}`);
          const postsResponse = await this.request(endpoint, {
            method: 'GET'
          });
          
          // Handle different response formats
          if (Array.isArray(postsResponse)) {
            posts = postsResponse;
          } else if (postsResponse.results) {
            posts = postsResponse.results;
          } else if (postsResponse.data) {
            posts = postsResponse.data;
          }
          
          console.log(`Successfully fetched ${posts.length} posts from ${endpoint}`);
          break;
        } catch (postsError) {
          console.warn(`Failed to fetch posts from ${endpoint}:`, postsError.message);
          continue;
        }
      }
      
      // Check if user is being followed by current user
      let isFollowing = false;
      try {
        const followResponse = await this.request(`/api/users/${username}/follow_status/`, {
          method: 'GET'
        });
        isFollowing = followResponse.is_following || false;
      } catch (error) {
        console.warn('Could not fetch follow status:', error);
      }
      
      // Transform response to match expected format
      return {
        user: {
          id: userResponse.id,
          username: userResponse.username,
          email: userResponse.email,
          first_name: userResponse.first_name,
          last_name: userResponse.last_name,
          follower_count: userResponse.follower_count || 0,
          following_count: userResponse.following_count || 0,
        },
        profile: {
          bio: userResponse.bio || '',
          avatar_url: userResponse.avatar_url || userResponse.avatar || '',
          joined_date: userResponse.date_joined,
        },
        posts: posts.map(post => ({
          ...post,
          subreddit: post.community?.name || post.subreddit || 'general',
          vote_score: post.calculated_score || post.score || 0,
          comment_count: post.comment_count || 0,
          image_url: post.image_url || post.image,
          created_at: post.created_at || post.created,
          user_vote: post.user_vote || null
        })),
        is_following: isFollowing
      };
    } catch (error) {
      // Add specific context for profile errors
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(`User "${username}" not found`);
      }
      
      if (error.message.includes('500')) {
        throw new Error(`Unable to load profile for "${username}". Please try again later.`);
      }
      
      throw error;
    }
  }

  // FIXED: Add followUser method
  async followUser(username) {
    if (!username) {
      throw new Error('Username is required');
    }

    try {
      // Try different follow endpoints
      const possibleEndpoints = [
        `/api/users/${username}/follow/`,
        `/api/follow/${username}/`,
        `/api/users/${username}/toggle_follow/`,
        `/api/auth/users/${username}/follow/`
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying follow endpoint: ${endpoint}`);
          const response = await this.request(endpoint, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
          });
          
          console.log(`Successfully used follow endpoint: ${endpoint}`);
          return {
            following: response.following || response.is_following || true,
            follower_count: response.follower_count || response.followers_count
          };
        } catch (error) {
          console.warn(`Failed to use follow endpoint ${endpoint}:`, error.message);
          continue;
        }
      }
      
      throw new Error('No working follow endpoint found');
    } catch (error) {
      throw new Error(error.message || 'Failed to update follow status');
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
    return await this.request('/api/register/', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
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