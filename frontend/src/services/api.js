// services/api.js - Optimized for clarity, efficiency, and maintainability
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class APIService {
  constructor() {
    this.baseURL = BASE_URL;
    this.csrfToken = null;
    this.csrfPromise = null; // Prevent multiple concurrent CSRF requests
  }

  // --- Core Methods ---

  /**
   * Centralized method for all API requests.
   * Handles CSRF, headers, body serialization, and error parsing.
   * @param {string} endpoint - The API endpoint (e.g., '/api/posts/').
   * @param {object} options - Configuration for the request.
   * @param {string} [options.method='GET'] - HTTP method.
   * @param {object|FormData} [options.body=null] - The request body.
   * @param {object} [options.headers={}] - Custom headers to merge.
   * Gửi request đến endpoint /ask_bot/ của PostViewSet
   * @param {string|number} postId
   * @returns {Promise<object>} BotSession object
   * @returns {Promise<any>} - The parsed JSON or text response.
   */


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
    if (isStateChanging && this.csrfToken) {
      configHeaders['X-CSRFToken'] = this.csrfToken;
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

  /**
   * Initializes the CSRF token by fetching it from the server.
   * Prevents multiple concurrent requests for the same token.
   */
  async initCSRF() {
    if (this.csrfToken) return this.csrfToken;

    // Try to get the CSRF token from the cookie immediately
    this.csrfToken = this.getCookie('csrftoken');
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If a request for the token is already in flight, wait for it
    if (this.csrfPromise) return this.csrfPromise;

    // Create a new promise to fetch the token only if not already present
    this.csrfPromise = (async () => {
      try {
        await this.request('/csrf/', { method: 'GET' });
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

  /**
   * Retrieves the CSRF token from multiple sources in order of preference.
   * @returns {string|null} The CSRF token.
   */
  getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value
      ?? this.getCookie('csrftoken')
      ?? this.csrfToken;
  }
  
  /**
   * A simple utility to parse a cookie by name.
   * @param {string} name - The name of the cookie.
   * @returns {string|null} The cookie value.
   */
  getCookie(name) {
    return document.cookie.match(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`)?.pop() || null;
  }

  isAuthenticated() {
    return !!this.getCSRFToken();
  }

  // --- Data Normalization Helpers ---

  /**
   * Normalizes tag data from various possible backend formats into a consistent structure.
   * Uses modern JavaScript (optional chaining, nullish coalescing) for conciseness.
   * @param {Array<object|string>} tags - An array of tags.
   * @returns {Array<object>} A normalized array of tag objects.
   */
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

  /**
   * Normalizes post data into a consistent structure.
   * @param {object} post - A post object from the API.
   * @returns {object} A normalized post object.
   */
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
    this.csrfToken = null; // Clear token on logout
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
    
    // Normalize response structure
    const posts = Array.isArray(data) ? data : (data?.results || data?.data || []);
    const normalizedPosts = posts.map(post => this.normalizePostData(post));

    return Array.isArray(data) ? normalizedPosts : { ...data, results: normalizedPosts };
  }
  
  async getPost(id) {
    const post = await this.request(`/api/posts/${id}/`);
    return this.normalizePostData(post);
  }

  async createPost(postData) {
    console.log('DEBUG: createPost called with:', postData);
    
    try {
      // The request method will handle FormData vs JSON automatically
      const post = await this.request('/api/posts/', { 
        method: 'POST', 
        body: postData 
      });
      
      console.log('DEBUG: createPost response:', post);
      return this.normalizePostData(post);
    } catch (error) {
      console.error('DEBUG: createPost error:', error);
      // Ném lỗi để component có thể bắt và hiển thị cho người dùng
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

  // Tags
  async getTags(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const data = await this.request(queryString ? `/api/tags/?${queryString}` : '/api/tags/');
    return data;
  }

  async createTag(tagData) {
    // tagData nên là một object, ví dụ: { name: 'new-tag-name' }
    // endpoint này cần được tạo ở backend (ví dụ /api/tags/create/)
    return this.request('/api/tags/create/', { method: 'POST', body: tagData });
  }
  
  // User Profile & Social
  async getUserProfile(username) {
    // Prefer the single, consolidated endpoint
    try {
      return await this.request(`/api/users/${username}/profile/`);
    } catch (error) {
      console.warn('Consolidated profile endpoint failed, trying fallbacks:', error.message);
      // Fallback logic if the primary endpoint is not available
      const user = await this.request(`/api/users/${username}/`);
      const profile = await this.request(`/api/profiles/${username}/`);
      const postsResponse = await this.request(`/api/posts/?author_username=${username}`);
      const followStatus = this.isAuthenticated()
        ? await this.request(`/api/users/${username}/follow_status/`)
        : { is_following: false };
      
      return {
        user,
        profile,
        posts: postsResponse.results || [],
        is_following: followStatus.is_following,
      };
    }
  }

  async updateUserProfile(username, profileData) {
    if (!(profileData instanceof FormData)) {
      throw new Error('profileData must be an instance of FormData');
    }
    return this.request(`/api/profiles/${username}/`, { method: 'PATCH', body: profileData });
  }

  async followUser(username) {
    const endpoints = [
      `/api/users/${username}/follow/`,
      `/api/follow/${username}/`,
      `/api/users/${username}/toggle_follow/`,
    ];
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying follow endpoint: ${endpoint}`);
        return await this.request(endpoint, { method: 'POST', body: {} });
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    throw new Error('Could not follow user. All endpoints failed.');
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
  async askBot(postId, payload) {
    return this.request(`/api/posts/${postId}/ask_bot/`, {
        method: 'POST',
        body: payload,
    });
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

/**
 * Custom error class for API-related issues.
 * Contains the status code and the parsed error data from the response body.
 */
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

// Create and export a singleton instance
const apiService = new APIService();
export default apiService;