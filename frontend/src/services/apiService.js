import api from './api';

class ApiService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Cache management
  getCacheKey(endpoint, params) {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Authentication services
  async login(credentials) {
    try {
      const response = await api.auth.login(credentials);
      this.clearCache(); // Clear cache on login
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const response = await api.auth.register(userData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      await api.auth.logout();
      this.clearCache(); // Clear cache on logout
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCurrentUser() {
    const cacheKey = this.getCacheKey('auth/user');
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return { success: true, data: cached };
    }

    try {
      const response = await api.auth.getCurrentUser();
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Posts services
  async getPosts(params = {}, useCache = true) {
    const cacheKey = this.getCacheKey('posts', params);
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.posts.getPosts(params);
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPost(postId, useCache = true) {
    const cacheKey = this.getCacheKey(`posts/${postId}`);
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.posts.getPost(postId);
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createPost(postData) {
    try {
      const response = await api.posts.createPost(postData);
      this.clearCache('posts'); // Clear posts cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updatePost(postId, postData) {
    try {
      const response = await api.posts.updatePost(postId, postData);
      this.clearCache('posts'); // Clear posts cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deletePost(postId) {
    try {
      await api.posts.deletePost(postId);
      this.clearCache('posts'); // Clear posts cache
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async votePost(postId, voteType) {
    try {
      const response = await api.posts.votePost(postId, voteType);
      this.clearCache(`posts/${postId}`); // Clear specific post cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Communities services
  async getCommunities(useCache = true) {
    const cacheKey = this.getCacheKey('communities');
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.communities.getCommunities();
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCommunity(slug, useCache = true) {
    const cacheKey = this.getCacheKey(`communities/${slug}`);
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.communities.getCommunity(slug);
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createCommunity(communityData) {
    try {
      const response = await api.communities.createCommunity(communityData);
      this.clearCache('communities'); // Clear communities cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Comments services
  async getComments(postId, useCache = true) {
    const cacheKey = this.getCacheKey(`posts/${postId}/comments`);
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.comments.getComments(postId);
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createComment(postId, commentData) {
    try {
      const response = await api.comments.createComment(postId, commentData);
      this.clearCache(`posts/${postId}/comments`); // Clear comments cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // User services
  async getProfile(username, useCache = true) {
    const cacheKey = this.getCacheKey(`users/${username}/profile`);
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.user.getProfile(username);
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.user.updateProfile(profileData);
      this.clearCache('users'); // Clear users cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async followUser(username) {
    try {
      const response = await api.user.followUser(username);
      this.clearCache(`users/${username}`); // Clear user cache
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Tags services
  async getTags(useCache = true) {
    const cacheKey = this.getCacheKey('tags');
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.tags.getTags();
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPopularTags(useCache = true) {
    const cacheKey = this.getCacheKey('tags/popular');
    
    if (useCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const response = await api.tags.getPopularTags();
      this.setCache(cacheKey, response);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Upload services
  async uploadImage(imageFile) {
    try {
      const response = await api.upload.uploadImage(imageFile);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Utility methods
  handleError(error) {
    api.utils.handleError(error);
  }
}

// Export singleton instance
const apiServiceInstance = new ApiService();
export default apiServiceInstance;