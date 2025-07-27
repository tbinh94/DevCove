// src/contexts/AuthContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiService from '../services/api'; // Import the correct service

// Initial state
const initialState = {
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
};

// Action types
const AuthActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    case AuthActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null,
      };
    
    case AuthActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case AuthActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext(null);

// Helper function to get CSRF token
const getCSRFToken = () => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken' + '=')) {
                cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkUserSession = async () => {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      
      try {
        const response = await apiService.checkAuth();
        
        if (response.isAuthenticated) {
          dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        } else {
          dispatch({ type: AuthActionTypes.SET_USER, payload: null });
        }
      } catch (error) {
        console.error("Session check failed:", error);
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      }
    };

    checkUserSession();
  }, []);

   // Login function - FIXED
  const login = async (credentials) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    try {
      const response = await apiService.login(credentials);
      // SỬA ĐỔI: Kiểm tra sự tồn tại của 'response.user' thay vì 'response.success'
      if (response && response.user) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        return { success: true, data: response };
      } else {
        // Trường hợp API trả về lỗi có cấu trúc nhưng không phải exception
        const errorMessage = response.error || "Login failed due to an unknown error.";
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error.message || "Login failed. Please check your credentials.";
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Register function - FIXED
  const register = async (userData) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    try {
      const response = await apiService.register(userData);
      // SỬA ĐỔI: Kiểm tra sự tồn tại của 'response.user' thay vì 'response.success'
      if (response && response.user) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        return { success: true, data: response };
      } else {
        const errorMessage = response.error || "Registration failed due to an unknown error.";
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error.message || "Registration failed.";
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    
    try {
      await apiService.logout();
      
      // Clear any stored tokens
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      
      dispatch({ type: AuthActionTypes.LOGOUT });
      return { success: true };
    } catch (error) {
      console.error("Logout error", error);
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Update user function
  const updateUser = (userData) => {
    dispatch({ type: AuthActionTypes.SET_USER, payload: userData });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Alternative hook name for compatibility
export const useAuthContext = useAuth;

// HOC for protected routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }
    
    return <Component {...props} />;
  };
};

// Component for protected routes
export const ProtectedRoute = ({ children, fallback = null }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return fallback || <div>Please login to access this page</div>;
  }
  
  return children;
};