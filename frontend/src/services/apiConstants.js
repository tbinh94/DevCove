// apiConstants.js - API Constants and Configuration

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    LOGOUT: '/auth/logout/',
    USER: '/auth/user/',
    REFRESH: '/auth/token/refresh/',
    RESET_PASSWORD: '/auth/password/reset/',
    CHANGE_PASSWORD: '/auth/password/change/',
  },
  
  // Posts
  POSTS: {
    LIST: '/posts/',
    DETAIL: (id) => `/posts/${id}/`,
    CREATE: '/posts/',
    UPDATE: (id) => `/posts/${id}/`,
    DELETE: (id) => `/posts/${id}/`,
    VOTE: (id) => `/posts/${id}/vote/`,
    COMMENTS: (id) => `/posts/${id}/comments/`,
    ADD_COMMENT: (id) => `/posts/${id}/add_comment/`,
  },
  
  // Communities
  COMMUNITIES: {
    LIST: '/communities/',
    DETAIL: (slug) => `/communities/${slug}/`,
    CREATE: '/communities/',
    UPDATE: (slug) => `/communities/${slug}/`,
    DELETE: (slug) => `/communities/${slug}/`,
    POSTS: (slug) => `/communities/${slug}/posts/`,
    JOIN: (slug) => `/communities/${slug}/join/`,
    LEAVE: (slug) => `/communities/${slug}/leave/`,
    MEMBERS: (slug) => `/communities/${slug}/members/`,
  },
  
  // Users
  USERS: {
    PROFILE: (username) => `/users/${username}/profile/`,
    POSTS: (username) => `/users/${username}/posts/`,
    COMMENTS: (username) => `/users/${username}/comments/`,
    FOLLOW: (username) => `/users/${username}/follow/`,
    UNFOLLOW: (username) => `/users/${username}/unfollow/`,
    FOLLOWERS: (username) => `/users/${username}/followers/`,
    FOLLOWING: (username) => `/users/${username}/following/`,
    SETTINGS: '/settings/',
  },
  
  // Tags
  TAGS: {
    LIST: '/tags/',
    POPULAR: '/tags/popular/',
    DETAIL: (name) => `/tags/${name}/`,
    POSTS: (name) => `/tags/${name}/posts/`,
  },
  
  // Comments
  COMMENTS: {
    LIST: '/comments/',
    DETAIL: (id) => `/comments/${id}/`,
    CREATE: '/comments/',
    UPDATE: (id) => `/comments/${id}/`,
    DELETE: (id) => `/comments/${id}/`,
    VOTE: (id) => `/comments/${id}/vote/`,
    REPLIES: (id) => `/comments/${id}/replies/`,
  },
  
  // Upload
  UPLOAD: {
    IMAGE: '/upload/image/',
    FILE: '/upload/file/',
    AVATAR: '/upload/avatar/',
  },
  
  // Search
  SEARCH: {
    POSTS: '/search/posts/',
    USERS: '/search/users/',
    COMMUNITIES: '/search/communities/',
    GLOBAL: '/search/',
  },
  
  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications/',
    MARK_READ: (id) => `/notifications/${id}/mark_read/`,
    MARK_ALL_READ: '/notifications/mark_all_read/',
    UNREAD_COUNT: '/notifications/unread_count/',
  },
};

// Vote Types
export const VOTE_TYPES = {
  UP: 'up',
  DOWN: 'down',
  NONE: 'none',
};

// Post Types
export const POST_TYPES = {
  TEXT: 'text',
  LINK: 'link',
  IMAGE: 'image',
  VIDEO: 'video',
};

// Sorting Options
export const SORT_OPTIONS = {
  HOT: 'hot',
  NEW: 'new',
  TOP: 'top',
  RISING: 'rising',
  CONTROVERSIAL: 'controversial',
};

// Time Filters
export const TIME_FILTERS = {
  ALL: 'all',
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 200, // pixels from bottom
};

// File Upload
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  REGISTER_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  POST_CREATED: 'Post created successfully!',
  POST_UPDATED: 'Post updated successfully!',
  POST_DELETED: 'Post deleted successfully!',
  COMMENT_CREATED: 'Comment added successfully!',
  COMMENT_UPDATED: 'Comment updated successfully!',
  COMMENT_DELETED: 'Comment deleted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  COMMUNITY_CREATED: 'Community created successfully!',
  COMMUNITY_JOINED: 'Successfully joined the community!',
  COMMUNITY_LEFT: 'Successfully left the community!',
  USER_FOLLOWED: 'User followed successfully!',
  USER_UNFOLLOWED: 'User unfollowed successfully!',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  PREFERENCES: 'preferences',
  DRAFT_POST: 'draft_post',
  VISITED_POSTS: 'visited_posts',
};

// Theme Options
export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// Language Options
export const LANGUAGE_OPTIONS = {
  EN: 'en',
  VI: 'vi',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  JA: 'ja',
  KO: 'ko',
  ZH: 'zh',
};

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  SLUG: /^[a-z0-9-]+$/,
};

// API Rate Limits
export const RATE_LIMITS = {
  POST_CREATION: 5, // posts per minute
  COMMENT_CREATION: 10, // comments per minute
  VOTE_ACTIONS: 100, // votes per minute
  FOLLOW_ACTIONS: 20, // follows per minute
  SEARCH_REQUESTS: 30, // searches per minute
};

// WebSocket Events
export const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  NEW_POST: 'new_post',
  NEW_COMMENT: 'new_comment',
  NEW_VOTE: 'new_vote',
  NEW_NOTIFICATION: 'new_notification',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_CHAT: process.env.REACT_APP_ENABLE_CHAT === 'true',
  ENABLE_NOTIFICATIONS: process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_DARK_MODE: process.env.REACT_APP_ENABLE_DARK_MODE === 'true',
  ENABLE_INFINITE_SCROLL: process.env.REACT_APP_ENABLE_INFINITE_SCROLL === 'true',
  ENABLE_VIDEO_UPLOAD: process.env.REACT_APP_ENABLE_VIDEO_UPLOAD === 'true',
};