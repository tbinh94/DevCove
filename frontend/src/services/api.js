// services/api.js - Fixed CSRF token handling
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  constructor() {
    this.baseURL = BASE_URL;
    this.csrfToken = null;
    this.csrfPromise = null; // Prevent multiple concurrent CSRF requests
  }

  // --- Core Methods ---

  async request(endpoint, { method = 'GET', body = null, headers = {}, ...restOptions } = {}) {
    // Ensure CSRF token is ready for state-changing methods
    const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
    if (isStateChanging) {
      await this.initCSRF();
    }

    const isFormData = body instanceof FormData;

    // Configure headers
    const configHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    };
    
    if (!isFormData && body) {
      configHeaders['Content-Type'] = 'application/json';
    }
    
    // FIXED: Single CSRF token handling logic
    if (isStateChanging) {
      const csrfToken = this.getCookie('csrftoken') || this.csrfToken;
      if (csrfToken) {
        configHeaders['X-CSRFToken'] = csrfToken;
      } else {
        console.warn('CSRF token not found. The request might fail.');
      }
    }

    // Configure body
    let processedBody = body;
    if (!isFormData && body) {
      processedBody = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method,
        body: processedBody,
        headers: configHeaders,
        credentials: 'include',
        ...restOptions,
      });
      
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorData;
        try {
          errorData = isJson ? await response.json() : await response.text();
        } catch {
          errorData = response.statusText;
        }
        throw new APIError(response.status, errorData);
      }
      
      if (response.status === 204) { // No Content
        return null;
      }
      
      return isJson ? response.json() : response.text();

    } catch (error) {
      console.error(`API request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  async initCSRF() {
    // Check if we already have a token
    this.csrfToken = this.getCookie('csrftoken');
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If there's already a CSRF request in progress, wait for it
    if (this.csrfPromise) {
      return this.csrfPromise;
    }

    // Make a new CSRF request
    this.csrfPromise = (async () => {
      try {
        await fetch(`${this.baseURL}/csrf/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          }
        });
        
        this.csrfToken = this.getCookie('csrftoken');
        if (!this.csrfToken) {
          console.warn('CSRF token not found in cookie after /csrf/ call.');
        }
        return this.csrfToken;
      } catch (error) {
        console.warn('CSRF token fetch failed:', error.message);
        return null;
      } finally {
        this.csrfPromise = null;
      }
    })();

    return this.csrfPromise;
  }

  // --- CSRF & Auth Utilities ---

  getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
      ?? this.getCookie('csrftoken')
      ?? this.csrfToken;
  }
  
  getCookie(name) {
    return document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`)?.pop() || null;
  }

  isAuthenticated() {
    return !!this.getCSRFToken();
  }

  // --- Data Normalization Helpers ---

  normalizeTagData(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map(tag => {
      if (typeof tag === 'object' && tag !== null) {
        return {
          id: tag?.id ?? tag?.pk ?? tag?.tag_id ?? tag?.name,
          name: tag?.name ?? tag?.title ?? tag?.tag_name ?? tag?.label ?? String(tag),
          color: tag?.color ?? tag?.tag_color ?? '#cccccc',
        };
      }
      if (typeof tag === 'string') {
        return { id: tag, name: tag, color: '#cccccc' };
      }
      return { id: tag, name: String(tag), color: '#cccccc' };
    });
  }

  normalizePostData(post) {
    if (!post) return null;
    const now = new Date().toISOString();
    return {
      ...post,
      tags: this.normalizeTagData(post.tags),
      calculated_score: post.calculated_score ?? post.score ?? 0,
      comment_count: post.comment_count ?? post.comments_count ?? 0,
      author: post.author ?? { username: 'Unknown' },
      user_vote: post.user_vote ?? null,
      created_at: post.created_at ?? now,
      updated_at: post.updated_at ?? post.created_at ?? now,
    };
  }

  // --- API Endpoint Methods ---

  // Authentication
  async login(credentials) {
    return this.request('/api/auth/login/', { method: 'POST', body: credentials });
  }
  async register(userData) {
    return this.request('/api/register/', { method: 'POST', body: userData });
  }
  async logout() {
    const response = await this.request('/api/auth/logout/', { method: 'POST', body: {} });
    this.csrfToken = null;
    return response;
  }
  async checkAuth() {
    try {
      return await this.request('/api/auth/user/');
    } catch {
      return { isAuthenticated: false, user: null };
    }
  }

  // Posts
  async getPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const data = await this.request(queryString ? `/api/posts/?${queryString}` : '/api/posts/');
    const posts = Array.isArray(data) ? data : (data?.results || data?.data || []);
    const normalizedPosts = posts.map(post => this.normalizePostData(post));
    return Array.isArray(data) ? normalizedPosts : { ...data, results: normalizedPosts };
  }
  
  async getPost(id) {
    const post = await this.request(`/api/posts/${id}/`);
    return this.normalizePostData(post);
  }
  
  async createPost(postData) {
    try {
      const post = await this.request('/api/posts/', { method: 'POST', body: postData });
      return this.normalizePostData(post);
    } catch (error) {
      throw error;
    }
  }

  async updatePost(id, postData) {
    const post = await this.request(`/api/posts/${id}/`, { method: 'PUT', body: postData });
    return this.normalizePostData(post);
  }

  async deletePost(id) {
    return this.request(`/api/posts/${id}/`, { method: 'DELETE' });
  }

  // === AI OVERVIEW FUNCTION ===
  /**
   * Generates an AI-powered overview for a list of posts.
   * @param {object} payload - The request payload.
   * @param {Array<number|string>} payload.post_ids - An array of post IDs to analyze.
   * @returns {Promise<object>} - The API response containing the overview.
   */

  async generatePostListOverview(payload) {
    return this.request('/api/posts/generate_overview/', {
      method: 'POST',
      body: payload,
    });
  }
  // Tags
  async getTags(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const data = await this.request(queryString ? `/api/tags/?${queryString}` : '/api/tags/');
    return data;
  }
  async createTag(tagData) {
    return this.request('/api/tags/create/', { method: 'POST', body: tagData });
  }
  
  // User Profile & Social
  async getUserProfile(username) {
    return this.request(`/api/users/${username}/profile/`);
  }

  async getChatCandidates() {
  try {
    return await this.request('/api/users/chat-candidates/', {
      headers: {
        'Authorization': `Bearer ${this.getCookie('access_token') || ''}`, // if you use JWT
        // hoặc nếu dùng session auth thì không cần Authorization header
      }
    });
  } catch (error) {
    console.error('Error fetching chat candidates:', error);
    throw new APIError(error.status || 500, error.data || 'Failed to fetch chat candidates');
  }
}
  
  async updateUserProfile(username, profileData) {
    if (!(profileData instanceof FormData)) {
      throw new Error('profileData must be an instance of FormData');
    }
    return this.request(`/api/profiles/${username}/`, { method: 'PATCH', body: profileData });
  }
  async followUser(username) {
    return this.request(`/api/users/${username}/follow/`, { method: 'POST', body: {} });
  }

  // Voting
  async vote(postId, voteType) {
    return this.request(`/api/posts/${postId}/vote/`, {
      method: 'POST',
      body: { vote_type: voteType },
    });
  }

  // Comments
  async getCommentsForPost(postId) {
    return this.request(`/api/posts/${postId}/comments/`);
  }
  async createComment(commentData) {
    return this.request('/api/comments/', { method: 'POST', body: commentData });
  }

  // Search
  async searchPosts(query, filters = {}) {
    const params = new URLSearchParams({ q: query, ...filters });
    const data = await this.request(`/api/posts/search/?${params}`);
    if (data?.results) {
      data.results = data.results.map(post => this.normalizePostData(post));
    }
    return data;
  }

  // Bot
  async askBot(postId, payload) {
    return this.request(`/api/posts/${postId}/ask_bot/`, {
        method: 'POST',
        body: payload,
    });
  }

  // --- Chat ---

  /**
   * Fetches all conversations for the current user.
   * @returns {Promise<Array<object>>} A list of conversations.
   */
  async getConversations() {
    return this.request('/api/conversations/');
  }

  /**
   * Gets or creates a one-on-one conversation with another user.
   * @param {number} userId - The ID of the other user.
   * @returns {Promise<object>} The conversation object.
   */
  async getOrCreateConversation(userId) {
    return this.request('/api/conversations/get_or_create/', {
      method: 'POST',
      body: { user_id: userId },
    });
  }

  /**
   * Fetches the message history for a specific conversation.
   * @param {string} conversationId - The UUID of the conversation.
   * @returns {Promise<Array<object>>} A list of messages.
   */
  async getChatMessages(conversationId) {
    return this.request(`/api/conversations/${conversationId}/messages/`);
  }


  // --- Utility Accessor ---
  get utils() {
    return {
      initCSRF: this.initCSRF.bind(this),
      getCSRFToken: this.getCSRFToken.bind(this),
      normalizeTagData: this.normalizeTagData.bind(this),
      normalizePostData: this.normalizePostData.bind(this),
    };
  }
}

class APIError extends Error {
  constructor(status, data) {
    const message = typeof data === 'object' && data !== null
      ? data.detail || data.message || JSON.stringify(data)
      : String(data);
      
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

const apiService = new APIService();
export default apiService;