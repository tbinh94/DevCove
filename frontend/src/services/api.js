// services/api.js - Enhanced with detailed error handling
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

  // Authentication - ENHANCED with detailed error handling
  async login(credentials) {
    try {
      const response = await this.request('/api/auth/login/', { 
        method: 'POST', 
        body: credentials 
      });
      
      // If successful, return the response as is
      return response;
      
    } catch (error) {
      console.error('Login API error:', error);
      
      if (error instanceof APIError) {
        // Handle different HTTP status codes
        switch (error.status) {
          case 400:
            // Validation errors
            if (error.data && typeof error.data === 'object') {
              if (error.data.username) {
                throw new AuthError(
                  'Please enter a valid username',
                  'VALIDATION_ERROR',
                  error.data
                );
              }
              if (error.data.password) {
                throw new AuthError(
                  'Please enter a valid password',
                  'VALIDATION_ERROR',
                  error.data
                );
              }
            }
            throw new AuthError(
              'Please check your input and try again',
              'VALIDATION_ERROR',
              error.data
            );

          case 401:
            // Authentication errors - check for specific error types from backend
            if (error.data && typeof error.data === 'object') {
              const errorType = error.data.error_type || error.data.errorType;
              const errorMessage = error.data.error || error.data.message || error.data.detail;
              
              switch (errorType) {
                case 'USER_NOT_FOUND':
                  throw new AuthError(
                    'Username not found. Please check your username or create a new account.',
                    'USER_NOT_FOUND',
                    error.data
                  );
                case 'INVALID_PASSWORD':
                  throw new AuthError(
                    'Incorrect password. Please try again.',
                    'INVALID_PASSWORD',
                    error.data
                  );
                case 'ACCOUNT_LOCKED':
                  throw new AuthError(
                    errorMessage || 'Account temporarily locked due to multiple failed attempts. Please try again later.',
                    'ACCOUNT_LOCKED',
                    error.data
                  );
                case 'ACCOUNT_DISABLED':
                  throw new AuthError(
                    'Your account has been disabled. Please contact support.',
                    'ACCOUNT_DISABLED',
                    error.data
                  );
                default:
                  throw new AuthError(
                    errorMessage || 'Invalid credentials. Please check your username and password.',
                    'INVALID_CREDENTIALS',
                    error.data
                  );
              }
            }
            
            // Fallback for 401 without detailed error structure
            throw new AuthError(
              'Invalid credentials. Please check your username and password.',
              'INVALID_CREDENTIALS',
              error.data
            );

          case 429:
            // Rate limiting
            throw new AuthError(
              'Too many login attempts. Please try again later.',
              'RATE_LIMITED',
              error.data
            );

          case 500:
          case 502:
          case 503:
            // Server errors
            throw new AuthError(
              'Server is temporarily unavailable. Please try again later.',
              'SERVER_ERROR',
              error.data
            );

          default:
            throw new AuthError(
              'An unexpected error occurred. Please try again.',
              'UNKNOWN_ERROR',
              error.data
            );
        }
      }
      
      // Network or other errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new AuthError(
          'Unable to connect to server. Please check your internet connection.',
          'NETWORK_ERROR',
          null
        );
      }
      
      // Fallback for any other errors
      throw new AuthError(
        error.message || 'Login failed. Please try again.',
        'UNKNOWN_ERROR',
        null
      );
    }
  }

  async register(userData) {
    try {
      // FIXED: Changed from '/api/register/' to '/api/auth/register/' to match login pattern
      return await this.request('/api/auth/register/', { method: 'POST', body: userData });
    } catch (error) {
      console.error('Registration API error:', error);
      
      if (error instanceof APIError && error.status === 400) {
        // Handle validation errors for registration
        if (error.data && typeof error.data === 'object') {
          const errors = [];
          
          if (error.data.username) {
            errors.push(`Username: ${Array.isArray(error.data.username) ? error.data.username.join(', ') : error.data.username}`);
          }
          if (error.data.email) {
            errors.push(`Email: ${Array.isArray(error.data.email) ? error.data.email.join(', ') : error.data.email}`);
          }
          if (error.data.password) {
            errors.push(`Password: ${Array.isArray(error.data.password) ? error.data.password.join(', ') : error.data.password}`);
          }
          
          if (errors.length > 0) {
            throw new AuthError(errors.join('. '), 'VALIDATION_ERROR', error.data);
          }
        }
      }
      
      throw error; // Re-throw if not handled
    }
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

  // ... rest of the methods remain the same ...
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
          'Authorization': `Bearer ${this.getCookie('access_token') || ''}`,
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
  async getAvailablePrompts() {
    return this.request('/api/posts/available_prompt_types/');
  }

  // --- Chat ---
  async getConversations() {
    return this.request('/api/conversations/');
  }

  async getOrCreateConversation(userId) {
    return this.request('/api/conversations/get_or_create/', {
      method: 'POST',
      body: { user_id: userId },
    });
  }

  async getChatMessages(conversationId) {
    return this.request(`/api/conversations/${conversationId}/messages/`);
  }

  async sendChatMessage(conversationId, messageData) {
    return this.request(`/api/conversations/${conversationId}/send_message/`, {
      method: 'POST',
      body: messageData,
    });
  }

  // Bot
  async getAiCodeFix(code, recommendation) {
    return this.request('/api/ai/refactor-code/', {
      method: 'POST',
      body: {
        code: code,
        prompt_type: 'refactor_code',
        recommendation_text: recommendation
      },
    });
  }

  async getAiGeneratedTitle(fullPrompt) {
    // Chúng ta sẽ gọi đến một endpoint mới, rõ ràng hơn
    return this.request('/api/ai/generate-title/', {
      method: 'POST',
      body: {
        prompt: fullPrompt, // Gửi toàn bộ lời nhắc đã được xây dựng ở frontend
      },
    });
  }
  
  async logBugFix(bugData) {
    return this.request('/api/bugs/log/', { 
      method: 'POST',
      body: bugData,
    });
  }

  async getBugStats(period = 'weekly') {
    const params = new URLSearchParams({ period });
    return this.request(`/api/bugs/stats/?${params}`);
  }
  
  async getBugExamples(errorMessage) {
    const params = new URLSearchParams({ error_message: errorMessage });
    return this.request(`/api/bugs/reviews/?${params}`);
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

// Enhanced APIError class
class APIError extends Error {
  constructor(status, data) {
    const message = typeof data === 'object' && data !== null
      ? data.detail || data.message || data.error || JSON.stringify(data)
      : String(data);
      
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// New AuthError class for authentication-specific errors
class AuthError extends Error {
  constructor(message, errorType = 'UNKNOWN_ERROR', data = null) {
    super(message);
    this.name = 'AuthError';
    this.errorType = errorType;
    this.data = data;
  }
}

const apiService = new APIService();
export default apiService;
export { AuthError };