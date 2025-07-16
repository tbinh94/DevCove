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
    if (!username) {
      throw new Error('Username is required');
    }

    // Support for request cancellation
    const { signal } = options;

    try {
      // Get user basic info - try different endpoints
      let userResponse;
      const userEndpoints = [
        `/api/users/${username}/`,
        `/api/auth/users/${username}/`,
        `/api/users/${username}`,
        `/api/profile/${username}/`
      ];

      for (const endpoint of userEndpoints) {
        try {
          console.log(`Trying user endpoint: ${endpoint}`);
          userResponse = await this.request(endpoint, {
            method: 'GET',
            signal
          });
          
          if (userResponse && (userResponse.id || userResponse.username)) {
            console.log(`Successfully fetched user data from ${endpoint}`);
            break;
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error; // Re-throw abort errors immediately
          }
          console.warn(`Failed to fetch user from ${endpoint}:`, error.message);
          continue;
        }
      }

      if (!userResponse) {
        throw new Error(`User "${username}" not found`);
      }
      
      // Get user's posts - try multiple endpoints with better error handling
      let posts = [];
      const possibleEndpoints = [
        `/api/posts/?author_username=${username}`, // Most likely to work based on logs
        `/api/users/${username}/posts/`,
        `/api/posts/?author=${username}`,
        `/api/posts/?user=${username}`,
        `/api/posts/?created_by=${username}`,
        `/api/posts/?username=${username}`
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying posts endpoint: ${endpoint}`);
          const postsResponse = await this.request(endpoint, {
            method: 'GET',
            signal
          });
          
          // Handle different response formats
          if (Array.isArray(postsResponse)) {
            posts = postsResponse;
          } else if (postsResponse?.results && Array.isArray(postsResponse.results)) {
            posts = postsResponse.results;
          } else if (postsResponse?.data && Array.isArray(postsResponse.data)) {
            posts = postsResponse.data;
          } else if (postsResponse?.posts && Array.isArray(postsResponse.posts)) {
            posts = postsResponse.posts;
          }
          
          console.log(`Successfully fetched ${posts.length} posts from ${endpoint}`);
          break;
        } catch (postsError) {
          if (postsError.name === 'AbortError') {
            throw postsError; // Re-throw abort errors immediately
          }
          console.warn(`Failed to fetch posts from ${endpoint}:`, postsError.message);
          continue;
        }
      }
      
      // If no posts found, set empty array but don't fail
      if (!Array.isArray(posts)) {
        console.warn('No posts found or invalid posts format, using empty array');
        posts = [];
      }
      
      // Check if user is being followed by current user
      let isFollowing = false;
      const followEndpoints = [
        `/api/users/${username}/follow_status/`,
        `/api/users/${username}/is_following/`,
        `/api/follow/${username}/status/`
      ];
      
      for (const endpoint of followEndpoints) {
        try {
          const followResponse = await this.request(endpoint, {
            method: 'GET',
            signal
          });
          isFollowing = followResponse?.is_following || followResponse?.following || false;
          console.log(`Successfully fetched follow status from ${endpoint}`);
          break;
        } catch (error) {
          if (error.name === 'AbortError') {
            throw error; // Re-throw abort errors immediately
          }
          console.warn(`Could not fetch follow status from ${endpoint}:`, error.message);
          continue;
        }
      }
      
      // Transform response to match expected format with safe property access
      const transformedResponse = {
        user: {
          id: userResponse.id,
          username: userResponse.username,
          email: userResponse.email || '',
          first_name: userResponse.first_name || '',
          last_name: userResponse.last_name || '',
          follower_count: Number(userResponse.follower_count) || 0,
          following_count: Number(userResponse.following_count) || 0,
        },
        profile: {
          bio: userResponse.bio || userResponse.profile?.bio || '',
          avatar_url: userResponse.avatar_url || userResponse.avatar || userResponse.profile?.avatar_url || '',
          joined_date: userResponse.date_joined || userResponse.created_at || userResponse.profile?.joined_date,
        },
        posts: posts.map(post => {
          // Safe post transformation with fallbacks
          try {
            return {
              id: post.id,
              title: post.title || '',
              content: post.content || post.text || '',
              subreddit: post.community?.name || post.subreddit || post.category || 'general',
              vote_score: Number(post.calculated_score || post.score || post.upvotes || 0),
              comment_count: Number(post.comment_count || post.comments_count || 0),
              image_url: post.image_url || post.image || '',
              created_at: post.created_at || post.created || post.timestamp,
              user_vote: post.user_vote || null,
              author: post.author || username,
              url: post.url || '',
              is_self: post.is_self || false
            };
          } catch (postError) {
            console.warn('Error transforming post:', postError, post);
            return {
              id: post.id || Math.random().toString(36),
              title: 'Error loading post',
              content: '',
              subreddit: 'general',
              vote_score: 0,
              comment_count: 0,
              image_url: '',
              created_at: new Date().toISOString(),
              user_vote: null,
              author: username,
              url: '',
              is_self: false
            };
          }
        }),
        is_following: isFollowing
      };
      
      // Final validation
      if (!transformedResponse.user.id || !transformedResponse.user.username) {
        throw new Error('Invalid user data received from server');
      }
      
      return transformedResponse;
      
    } catch (error) {
      // Don't wrap abort errors - let them bubble up as-is
      if (error.name === 'AbortError') {
        console.log('Request was aborted in getUserProfile');
        throw error;
      }
      
      // Add specific context for profile errors
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(`User "${username}" not found`);
      }
      
      if (error.message.includes('400')) {
        throw new Error(`Invalid request for user "${username}". Please check the username.`);
      }
      
      if (error.message.includes('500')) {
        throw new Error(`Unable to load profile for "${username}". Please try again later.`);
      }
      
      if (error.message.includes('Network error') || error.message.includes('fetch')) {
        throw new Error(`Network error while loading profile for "${username}". Please check your connection.`);
      }
      
      if (error.message.includes('timeout')) {
        throw new Error(`Request timeout while loading profile for "${username}". Please try again.`);
      }
      
      // Re-throw with original message if it's already a meaningful error
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