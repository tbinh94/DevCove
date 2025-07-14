// AuthContext.js - Authentication Context Provider

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import ApiService from '../services/apiService';

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
const AuthContext = createContext();

// Helper function to get CSRF token
const getCSRFToken = () => {
  return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      
      try {
        const result = await ApiService.getCurrentUser();
        
        if (result.success) {
          dispatch({ type: AuthActionTypes.SET_USER, payload: result.data });
        } else {
          dispatch({ type: AuthActionTypes.SET_USER, payload: null });
        }
      } catch (error) {
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      }
    };

    checkAuth();
  }, []);

  // Login function - FIXED
  const login = async (credentials) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      // Option 1: Use ApiService (recommended for consistency)
      const result = await ApiService.login(credentials);
      
      if (result.success) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: result.data.user });
        return { success: true, data: result.data };
      } else {
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
      
      // Option 2: Direct fetch (if you prefer)
      /*
      const authResponse = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify(credentials)
      });
      
      const authData = await authResponse.json();
      
      if (authData.success) {
        // Store token if using token auth
        if (authData.token) {
          localStorage.setItem('authToken', authData.token);
        }
        
        // Update context state with user data
        dispatch({ type: AuthActionTypes.SET_USER, payload: authData.user });
        
        return { success: true, data: authData };
      } else {
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: authData.error || 'Login failed' });
        return { success: false, error: authData.error || 'Login failed' };
      }
      */
      
    } catch (error) {
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      const result = await ApiService.register(userData);
      
      if (result.success) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: result.data.user });
        return { success: true, data: result.data };
      } else {
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: result.error });
        return { success: false, error: result.error };
      }
    } catch (error) {
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    
    try {
      await ApiService.logout();
      
      // Clear any stored tokens
      localStorage.removeItem('authToken');
      
      dispatch({ type: AuthActionTypes.LOGOUT });
      return { success: true };
    } catch (error) {
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
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for protected routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuthContext();
    
    if (loading) {
      return <div>Loading...</div>; // You can replace with your loading component
    }
    
    if (!isAuthenticated) {
      // Redirect to login or show login form
      window.location.href = '/login';
      return null;
    }
    
    return <Component {...props} />;
  };
};

// Component for protected routes
export const ProtectedRoute = ({ children, fallback = null }) => {
  const { isAuthenticated, loading } = useAuthContext();
  
  if (loading) {
    return <div>Loading...</div>; // You can replace with your loading component
  }
  
  if (!isAuthenticated) {
    return fallback || <div>Please login to access this page</div>;
  }
  
  return children;
};