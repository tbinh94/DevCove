// useApi.js - Custom React hooks for API operations

import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from './apiService';

// Base hook for API operations
export const useApi = (apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(options.immediate !== false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(...args);
      
      if (mountedRef.current) {
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      }
      
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
      return { success: false, error: err.message };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute]);

  return { data, loading, error, execute, refetch: execute };
};

// Authentication hooks
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCurrentUser = useCallback(async () => {
    setLoading(true);
    const result = await apiService.getCurrentUser();
    
    if (result.success) {
      setUser(result.data);
    } else {
      setUser(null);
    }
    
    setLoading(false);
    return result;
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    const result = await apiService.login(credentials);
    
    if (result.success) {
      setUser(result.data.user);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  const register = useCallback(async (userData) => {
    setLoading(true);
    const result = await apiService.register(userData);
    
    if (result.success) {
      setUser(result.data.user);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    const result = await apiService.logout();
    
    if (result.success) {
      setUser(null);
      setError(null);
    }
    
    setLoading(false);
    return result;
  }, []);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated: !!user
  };
};

// Posts hooks
export const usePosts = (params = {}, options = {}) => {
  return useApi(
    () => apiService.getPosts(params),
    [JSON.stringify(params)],
    options
  );
};

export const usePost = (postId, options = {}) => {
  return useApi(
    () => apiService.getPost(postId),
    [postId],
    options
  );
};

export const useCreatePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createPost = useCallback(async (postData) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.createPost(postData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { createPost, loading, error };
};

export const useUpdatePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updatePost = useCallback(async (postId, postData) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.updatePost(postId, postData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { updatePost, loading, error };
};

export const useDeletePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deletePost = useCallback(async (postId) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.deletePost(postId);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { deletePost, loading, error };
};

export const useVotePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const votePost = useCallback(async (postId, voteType) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.votePost(postId, voteType);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { votePost, loading, error };
};

// Communities hooks
export const useCommunities = (options = {}) => {
  return useApi(
    () => apiService.getCommunities(),
    [],
    options
  );
};

export const useCommunity = (slug, options = {}) => {
  return useApi(
    () => apiService.getCommunity(slug),
    [slug],
    options
  );
};

export const useCreateCommunity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createCommunity = useCallback(async (communityData) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.createCommunity(communityData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { createCommunity, loading, error };
};

// Comments hooks
export const useComments = (postId, options = {}) => {
  return useApi(
    () => apiService.getComments(postId),
    [postId],
    options
  );
};

export const useCreateComment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createComment = useCallback(async (postId, commentData) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.createComment(postId, commentData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { createComment, loading, error };
};

// User hooks
export const useProfile = (username, options = {}) => {
  return useApi(
    () => apiService.getProfile(username),
    [username],
    options
  );
};

export const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateProfile = useCallback(async (profileData) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.updateProfile(profileData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { updateProfile, loading, error };
};

export const useFollowUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const followUser = useCallback(async (username) => {
    setLoading(true);
    setError(null);
    
    const result = await apiService.followUser(username);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  }, []);

  return { followUser, loading, error };
};

// Tags hooks
export const useTags = (options = {}) => {
  return useApi(
    () => apiService.getTags(),
    [],
    options
  );
};

export const usePopularTags = (options = {}) => {
  return useApi(
    () => apiService.getPopularTags(),
    [],
    options
  );
};

// Upload hooks
export const useUpload = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const uploadImage = useCallback(async (imageFile) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    
    const result = await apiService.uploadImage(imageFile);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    setProgress(100);
    return result;
  }, []);

  return { uploadImage, loading, error, progress };
};

// Pagination hook
export const usePagination = (fetchFunction, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [params, setParams] = useState(initialParams);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction({ ...params, page });
      
      if (result.success) {
        const newData = result.data.results || result.data;
        setData(prev => page === 1 ? newData : [...prev, ...newData]);
        setHasMore(!!result.data.next);
        setPage(prev => prev + 1);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, params, page, loading, hasMore]);

  const refresh = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  const updateParams = useCallback((newParams) => {
    setParams(newParams);
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadMore();
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    updateParams
  };
};

// Search hook
export const useSearch = (searchFunction, debounceMs = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchFunction(searchQuery);
      
      if (result.success) {
        setResults(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchFunction]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, search, debounceMs]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search
  };
};

// Form hook for API operations
export const useForm = (initialValues = {}, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    setErrors({});

    try {
      const result = await onSubmit(values);
      
      if (!result.success) {
        if (result.error && typeof result.error === 'object') {
          setErrors(result.error);
        } else {
          setErrors({ general: result.error });
        }
      }
      
      return result;
    } catch (err) {
      setErrors({ general: err.message });
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [values, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    loading,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset
  };
};

// Optimistic update hook
export const useOptimistic = (initialData, updateFunction) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = useCallback(async (optimisticData, actualUpdateFunction) => {
    // Apply optimistic update
    setData(optimisticData);
    setLoading(true);
    setError(null);

    try {
      const result = await actualUpdateFunction();
      
      if (result.success) {
        // Use actual data from server
        setData(result.data);
      } else {
        // Revert on failure
        setData(initialData);
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      // Revert on error
      setData(initialData);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [initialData]);

  return { data, loading, error, update };
};