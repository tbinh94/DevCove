import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
// ✅ Thêm Navigate và Outlet để xử lý điều hướng trong React Router v6
import { Navigate } from 'react-router-dom';
import apiService, { AuthError } from '../services/api'; // Import AuthError

// Initial state
const initialState = {
  user: null,
  loading: true,
  error: null,
  errorType: null,
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
        errorType: null,
      };
    
    case AuthActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload.message || action.payload,
        errorType: action.payload.type || null,
        loading: false,
      };
    
    case AuthActionTypes.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        errorType: null,
      };
    
    case AuthActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        errorType: null,
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

  const isAdmin = useMemo(() => {
    // Luôn kiểm tra `state.user` để đảm bảo an toàn
    if (!state.user) {
      return false;
    }
    // Kiểm tra các trường có thể có. Dùng 'ADMIN' (viết hoa) để nhất quán với backend.
    return state.user.role === 'ADMIN' || state.user.is_admin === true;
  }, [state.user]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkUserSession = async () => {
      dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
      // Khởi động CSRF token ngay khi ứng dụng tải để các request sau này (như login) không bị chặn.
      apiService.utils.initCSRF();
      try {
        const response = await apiService.checkAuth();
        
        if (response.isAuthenticated) {
          dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        } else {
          dispatch({ type: AuthActionTypes.SET_USER, payload: null });
        }
      } catch (error) {
        console.error("Session check failed:", error);
        dispatch({ type: AuthActionTypes.SET_ERROR, payload: { message: error.message } });
      }
    };

    checkUserSession();
  }, []);

  // Login function - ENHANCED with detailed error handling
  const login = async (credentials) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      const response = await apiService.login(credentials);
      
      console.log('Login API response:', response);
      
      // Check if login was successful
      if (response && response.user) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        return { success: true, data: response };
      } else {
        // Handle case where API doesn't return user data
        const errorMessage = response.error || "Login failed. Please check your credentials.";
        dispatch({ 
          type: AuthActionTypes.SET_ERROR, 
          payload: { message: errorMessage, type: 'GENERAL' } 
        });
        return { success: false, error: errorMessage, errorType: 'GENERAL' };
      }
      
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      
      // Handle AuthError with detailed error types
      if (error instanceof AuthError) {
        dispatch({ 
          type: AuthActionTypes.SET_ERROR, 
          payload: { message: error.message, type: error.errorType } 
        });
        return { 
          success: false, 
          error: error.message, 
          errorType: error.errorType,
          data: error.data 
        };
      }
      
      // Handle other errors
      const errorMessage = error.message || "Login failed. Please try again.";
      const errorType = error.name === 'TypeError' && error.message.includes('fetch') 
        ? 'NETWORK_ERROR' 
        : 'UNKNOWN_ERROR';
      
      dispatch({ 
        type: AuthActionTypes.SET_ERROR, 
        payload: { message: errorMessage, type: errorType } 
      });
      
      return { 
        success: false, 
        error: errorMessage, 
        errorType: errorType 
      };
    }
  };

  // Register function - ENHANCED with detailed error handling
  const register = async (userData) => {
    dispatch({ type: AuthActionTypes.SET_LOADING, payload: true });
    dispatch({ type: AuthActionTypes.CLEAR_ERROR });
    
    try {
      const response = await apiService.register(userData);
      
      if (response && response.user) {
        dispatch({ type: AuthActionTypes.SET_USER, payload: response.user });
        return { success: true, data: response };
      } else {
        const errorMessage = response.error || "Registration failed. Please try again.";
        dispatch({ 
          type: AuthActionTypes.SET_ERROR, 
          payload: { message: errorMessage, type: 'GENERAL' } 
        });
        return { success: false, error: errorMessage, errorType: 'GENERAL' };
      }
      
    } catch (error) {
      console.error('Registration error in AuthContext:', error);
      
      // Handle AuthError with detailed error types
      if (error instanceof AuthError) {
        dispatch({ 
          type: AuthActionTypes.SET_ERROR, 
          payload: { message: error.message, type: error.errorType } 
        });
        return { 
          success: false, 
          error: error.message, 
          errorType: error.errorType,
          data: error.data 
        };
      }
      
      // Handle other errors
      const errorMessage = error.message || "Registration failed. Please try again.";
      const errorType = error.name === 'TypeError' && error.message.includes('fetch') 
        ? 'NETWORK_ERROR' 
        : 'UNKNOWN_ERROR';
      
      dispatch({ 
        type: AuthActionTypes.SET_ERROR, 
        payload: { message: errorMessage, type: errorType } 
      });
      
      return { 
        success: false, 
        error: errorMessage, 
        errorType: errorType 
      };
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
      dispatch({ type: AuthActionTypes.SET_ERROR, payload: { message: error.message } });
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
    isAdmin,
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

// ✅ TẠO COMPONENT BẢO VỆ ROUTE DÀNH RIÊNG CHO ADMIN
const NotAuthorized = () => (
    <div style={{ 
        padding: '50px', 
        textAlign: 'center', 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
    }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>403 - Forbidden</h1>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>You must be the administrator to access this page.</p>
        <a href="/" style={{ color: '#61dafb', marginTop: '2rem', textDecoration: 'underline' }}>Go to Homepage</a>
    </div>
);

export const AdminRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        // Hiển thị thông báo trong khi kiểm tra phiên đăng nhập
        return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>Checking permissions...</div>;
    }

    if (!isAuthenticated) {
        // Nếu chưa đăng nhập, điều hướng về trang login
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'ADMIN') {
        // Nếu đã đăng nhập nhưng không phải admin, hiển thị trang không có quyền truy cập
        return <NotAuthorized />;
    }

    // Nếu đã đăng nhập và là admin, cho phép truy cập component con
    return children;
};