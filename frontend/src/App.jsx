import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import components
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import SearchResults from './components/common/SearchResults.jsx';
import CreatePostPage from './components/posts/CreatePostPage.jsx';
import PostDetail from './components/PostDetail';
import PostList from './components/PostList';
import UserProfile from './components/UserProfile';
import { Header, Footer, MainLayout, Sidebar } from './components/common/layout';
// Import API
import apiService from './services/api';


import AuthTest from './AuthTest';

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Initialize CSRF token first
      await apiService.utils?.initCSRF?.();
      
      // Check authentication
      const result = await apiService.checkAuth();
      
      if (result.isAuthenticated) {
        setUser(result.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        Loading...
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#dae0e6' }}>
          <Routes>
            {/* Routes có MainLayout (sidebar + content) */}
            <Route path="/" element={<MainLayout user={user} />}>
              {/* Home page - shows all posts with Hot/New/Top filters */}
              <Route index element={<PostList user={user} />} />
              <Route path="hot" element={<PostList user={user} filter="hot" />} />
              <Route path="new" element={<PostList user={user} filter="new" />} />
              <Route path="top" element={<PostList user={user} filter="top" />} />
              
              {/* Post routes */}
              <Route path="posts" element={<PostList user={user} />} />
              
              {/* Tag routes - individual tags with filters */}
              <Route path="tags" element={<PostList user={user} showAllTags={true} />} />
              <Route path="tag/:tagName" element={<PostList user={user} />} />
              <Route path="tag/:tagName/hot" element={<PostList user={user} filter="hot" />} />
              <Route path="tag/:tagName/new" element={<PostList user={user} filter="new" />} />
              <Route path="tag/:tagName/top" element={<PostList user={user} filter="top" />} />
              
              {/* Search routes */}
              <Route path="search" element={<SearchResults user={user} />} />
              
              {/* Community routes */}
              <Route path="communities" element={<PostList user={user} />} />
              <Route path="community/:name" element={<PostList user={user} />} />
              <Route path="community/:name/hot" element={<PostList user={user} filter="hot" />} />
              <Route path="community/:name/new" element={<PostList user={user} filter="new" />} />
              <Route path="community/:name/top" element={<PostList user={user} filter="top" />} />
            </Route>
            

            {/* Routes không cần MainLayout (fullscreen) */}
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage onLogin={handleLogin} />} />
            <Route path="/post/:id" element={<PostDetail user={user} />} />
            <Route path="/create-post" element={<CreatePostPage user={user} />} />
            <Route path="/user/:username" element={<UserProfile user={user} />} />
            <Route path="/profile" element={<UserProfile user={user} />} />
            
            {/* Fallback route */}
            <Route path="*" element={<MainLayout user={user} />}>
              <Route index element={<PostList user={user} />} />
            </Route>

            <Route path="/auth-test" component={AuthTest} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;