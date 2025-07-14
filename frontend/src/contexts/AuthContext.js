// src/contexts/AuthContext.js
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
        // Try using ApiService first (if available)
        let result;
        if (typeof ApiService !== 'undefined' && ApiService.getCurrentUser) {
          result = await ApiService.getCurrentUser();
          if (result.success) {
            dispatch({ type: AuthActionTypes.SET_USER, payload: result.data });
          } else {
            dispatch({ type: AuthActionTypes.SET_USER, payload: null });
          }
        } else {
          // Fallback to direct fetch
          const response = await fetch('/api/auth/current_user/');
          if (response.ok) {
            const data = await response.json();
            if (data.isAuthenticated) {
              dispatch({ type: AuthActionTypes.SET_USER, payload: data.user });
            } else {
              dispatch({ type: AuthActionTypes.SET_USER, payload: null });
            }
          } else {
            dispatch({ type: AuthActionTypes.SET_USER, payload: null });
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: error.message });
      }
    };

    checkUserSession();
  }, []);

  // Login function - supports both username/password and credentials object
  const login = async (usernameOrCredentials, password) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      // Handle different parameter formats
      let credentials;
      if (typeof usernameOrCredentials === 'string') {
        credentials = { username: usernameOrCredentials, password };
      } else {
        credentials = usernameOrCredentials;
      }

      // Try using ApiService first (if available)
      if (typeof ApiService !== 'undefined' && ApiService.login) {
        const result = await ApiService.login(credentials);
        
        if (result.success) {
          dispatch({ type: AuthActionTypes.SET_USER, payload: result.data.user });
          return { success: true, data: result.data };
        } else {
          dispatch({ type: AuthActionTypes.SET_ERROR, payload: result.error });
          return { success: false, error: result.error };
        }
      } else {
        // Fallback to direct fetch
        const response = await fetch('/api/auth/login/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: AuthActionTypes.SET_USER, payload: data.user });
          return { success: true, data };
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Login failed.";
          dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
          return { success: false, error: errorMessage };
        }
      }
    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      // Try using ApiService first (if available)
      if (typeof ApiService !== 'undefined' && ApiService.register) {
        const result = await ApiService.register(userData);
        
        if (result.success) {
          dispatch({ type: AuthActionTypes.SET_USER, payload: result.data.user });
          return { success: true, data: result.data };
        } else {
          dispatch({ type: AuthActionTypes.SET_ERROR, payload: result.error });
          return { success: false, error: result.error };
        }
      } else {
        // Fallback to direct fetch
        const response = await fetch('/api/auth/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
          body: JSON.stringify(userData),
        });

        if (response.ok) {
          const data = await response.json();
          dispatch({ type: AuthActionTypes.SET_USER, payload: data.user });
          return { success: true, data };
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Registration failed.";
          dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
          return { success: false, error: errorMessage };
        }
      }
    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    
    try {
      // Try using ApiService first (if available)
      if (typeof ApiService !== 'undefined' && ApiService.logout) {
        await ApiService.logout();
      } else {
        // Fallback to direct fetch
        const response = await fetch('/api/auth/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        });

        if (!response.ok) {
          throw new Error('Logout failed');
        }
      }
      
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

  // Only render children after session check is complete
  return (
    <AuthContext.Provider value={value}>
      {!state.loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context (supports both useAuth and useAuthContext)
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
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // You can replace with your loading component
  }
  
  if (!isAuthenticated) {
    return fallback || <div>Please login to access this page</div>;
  }
  
  return children;
};