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
  async getUserProfile(username, options = {}) {
    try {
      console.log(`Trying user endpoint: /api/users/${username}/`);
      
      // First, get user data from the profile endpoint
      const response = await this.request(`/api/users/${username}/profile/`, {
        method: 'GET',
        ...options
      });
      
      console.log('Raw API response:', response);
      
      // The API should return the complete profile data including avatar_url
      if (response && response.user && response.profile) {
        console.log('Profile data with avatar_url:', response.profile.avatar_url);
        
        // Return the response as-is since the API already provides the correct format
        return {
          user: response.user,
          profile: response.profile,
          posts: response.posts || [],
          is_following: response.is_following || false
        };
      }
      
      // Fallback: if the above doesn't work, try the individual endpoints
      console.log('Fallback: Using individual endpoints');
      
      // Get basic user info
      const userResponse = await this.request(`/api/users/${username}/`, {
        method: 'GET',
        ...options
      });
      
      console.log('Successfully fetched user data from /api/users/${username}/', userResponse);
      
      let profileData = {};
      let postsData = [];
      let followStatus = false;
      
      // Get user's profile info
      try {
        const profileResponse = await this.request(`/api/profiles/${username}/`, {
          method: 'GET',
          ...options
        });
        
        console.log('Profile response:', profileResponse);
        
        // Extract profile data and ensure avatar_url is included
        profileData = {
          bio: profileResponse.bio || '',
          avatar_url: profileResponse.avatar_url || null,
          joined_date: userResponse.date_joined
        };
        
        console.log('Processed profile data:', profileData);
        
      } catch (profileError) {
        console.log('Profile fetch failed, using defaults:', profileError.message);
        profileData = {
          bio: '',
          avatar_url: null,
          joined_date: userResponse.date_joined
        };
      }
      
      // Get user's posts
      try {
        console.log(`Trying posts endpoint: /api/posts/?author_username=${username}`);
        const postsResponse = await this.request(`/api/posts/?author_username=${username}`, {
          method: 'GET',
          ...options
        });
        
        postsData = postsResponse.results || postsResponse || [];
        console.log(`Successfully fetched ${postsData.length} posts from /api/posts/?author_username=${username}`);
        
      } catch (postsError) {
        console.log('Posts fetch failed:', postsError.message);
        postsData = [];
      }
      
      // Get follow status if user is authenticated
      if (this.isAuthenticated()) {
        try {
          console.log(`Trying follow status endpoint: /api/users/${username}/follow_status/`);
          const followResponse = await this.request(`/api/users/${username}/follow_status/`, {
            method: 'GET',
            ...options
          });
          
          followStatus = followResponse.is_following || false;
          console.log(`Successfully fetched follow status from /api/users/${username}/follow_status/`);
          
        } catch (followError) {
          console.log('Follow status fetch failed:', followError.message);
          followStatus = false;
        }
      }
      
      // Combine all data
      const combinedData = {
        user: {
          id: userResponse.id,
          username: userResponse.username,
          email: userResponse.email,
          first_name: userResponse.first_name,
          last_name: userResponse.last_name,
          date_joined: userResponse.date_joined,
          follower_count: userResponse.follower_count || 0,
          following_count: userResponse.following_count || 0,
        },
        profile: profileData,
        posts: postsData,
        is_following: followStatus
      };
      
      console.log('Final combined data:', combinedData);
      console.log('Avatar URL in final data:', combinedData.profile.avatar_url);
      
      return combinedData;
      
    } catch (error) {
      console.error('Error in getUserProfile:', error);
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
  async updateUserProfile(username, profileData) {
    if (!username) {
      throw new Error('Username is required for updating profile');
    }
    
    // profileData should be an instance of FormData
    const isForm = profileData instanceof FormData;
    
    if (!isForm) {
      throw new Error('profileData must be an instance of FormData');
    }

    // Ensure CSRF token is available
    let csrfToken = this.getCSRFToken();
    if (!csrfToken) {
      csrfToken = await this.initCSRF();
      if (!csrfToken) throw new Error('Could not get CSRF token');
    }

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrfToken,
    };
    // Don't set 'Content-Type' for FormData, the browser will do it with the correct boundary

    try {
      const response = await fetch(`${this.baseURL}/api/profiles/${username}/`, {
        method: 'PATCH', // Use PATCH for partial updates
        credentials: 'include',
        headers,
        body: profileData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          // Flatten errors for easier display
          const flatErrors = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
          errorMessage = flatErrors || errorMessage;
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('Update profile error:', error);
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