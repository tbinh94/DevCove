// services/api.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  constructor() {
    this.baseURL = `${BASE_URL}/api`;
    this.csrfToken = null;
  }

  // Get CSRF token and set up headers
  async initCSRF() {
    try {
      const response = await fetch(`${this.baseURL}/csrf/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
        return this.csrfToken;
      }
    } catch (error) {
      console.error('CSRF token fetch failed:', error);
    }
    return null;
  }

  // Get default headers with CSRF token
  getHeaders(includeCSRF = true) {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (includeCSRF && this.csrfToken) {
      headers['X-CSRFToken'] = this.csrfToken;
    }
    
    return headers;
  }

  // Generic API request method
  async request(url, options = {}) {
    const config = {
      credentials: 'include',
      headers: this.getHeaders(),
      ...options,
    };

    // Add CSRF token to POST/PUT/DELETE requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
      if (!this.csrfToken) {
        await this.initCSRF();
      }
      config.headers['X-CSRFToken'] = this.csrfToken;
    }

    try {
      const response = await fetch(`${this.baseURL}${url}`, config);
      
      // Handle different response types
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
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

  // Authentication methods
  async login(credentials) {
    try {
      const response = await this.request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async register(userData) {
    try {
      const response = await this.request('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout() {
    try {
      const response = await this.request('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      
      // Clear CSRF token after logout
      this.csrfToken = null;
      
      return response;
    } catch (error) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  async checkAuth() {
    try {
      const response = await this.request('/auth/user/', {
        method: 'GET',
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
    const url = queryString ? `/posts/?${queryString}` : '/posts/';
    return await this.request(url);
  }

  async getPost(id) {
    return await this.request(`/posts/${id}/`);
  }

  async createPost(postData) {
    return await this.request('/posts/', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updatePost(id, postData) {
    return await this.request(`/posts/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  }

  async deletePost(id) {
    return await this.request(`/posts/${id}/`, {
      method: 'DELETE',
    });
  }

  async votePost(id, voteType) {
    return await this.request(`/posts/${id}/vote/`, {
      method: 'POST',
      body: JSON.stringify({ vote_type: voteType }),
    });
  }

  async getUserVote(postId) {
    return await this.request(`/posts/${postId}/user_vote/`);
  }

  // Comments methods
  async getComments(postId) {
    return await this.request(`/comments/?post=${postId}`);
  }

  async createComment(commentData) {
    return await this.request('/comments/', {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  }

  async updateComment(id, commentData) {
    return await this.request(`/comments/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(commentData),
    });
  }

  async deleteComment(id) {
    return await this.request(`/comments/${id}/`, {
      method: 'DELETE',
    });
  }

  // Search methods
  async search(query, type = 'all') {
    const params = new URLSearchParams({ q: query, type });
    return await this.request(`/search/?${params}`);
  }

  // Tags methods
  async getTags() {
    return await this.request('/tags/');
  }

  async getPopularTags() {
    return await this.request('/tags/popular/');
  }

  async getTagPosts(tagId) {
    return await this.request(`/tags/${tagId}/posts/`);
  }

  // Communities methods
  async getCommunities() {
    return await this.request('/communities/');
  }

  async getCommunity(slug) {
    return await this.request(`/communities/${slug}/`);
  }

  async createCommunity(communityData) {
    return await this.request('/communities/', {
      method: 'POST',
      body: JSON.stringify(communityData),
    });
  }

  async getCommunityPosts(slug) {
    return await this.request(`/communities/${slug}/posts/`);
  }

  // Users methods
  async getUser(username) {
    return await this.request(`/users/${username}/`);
  }

  async getUserPosts(username) {
    return await this.request(`/users/${username}/posts/`);
  }

  async followUser(username) {
    return await this.request(`/users/${username}/follow/`, {
      method: 'POST',
    });
  }

  async getFollowStatus(username) {
    return await this.request(`/users/${username}/follow_status/`);
  }

  // Notifications methods
  async getNotifications() {
    return await this.request('/notifications/');
  }

  async getUnreadCount() {
    return await this.request('/notifications/unread_count/');
  }

  async markNotificationRead(id) {
    return await this.request(`/notifications/${id}/mark_read/`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return await this.request('/notifications/mark_all_read/', {
      method: 'PATCH',
    });
  }

  // Utility methods
  get utils() {
    return {
      initCSRF: () => this.initCSRF(),
      getCSRFToken: () => this.csrfToken,
      setCSRFToken: (token) => { this.csrfToken = token; },
    };
  }
}

// Create and export a singleton instance
const apiService = new APIService();
export default apiService;