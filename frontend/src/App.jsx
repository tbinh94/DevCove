import React from 'react';
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

import AuthTest from './AuthTest';

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#dae0e6' }}>
          <Routes>
            {/* Routes có MainLayout (sidebar + content) */}
            <Route path="/" element={<MainLayout />}>
              {/* Home page - shows all posts with Hot/New/Top filters */}
              <Route index element={<PostList />} />
              <Route path="hot" element={<PostList filter="hot" />} />
              <Route path="new" element={<PostList filter="new" />} />
              <Route path="top" element={<PostList filter="top" />} />
              
              {/* Post routes */}
              <Route path="posts" element={<PostList />} />
              
              {/* Tag routes - individual tags with filters */}
              <Route path="tags" element={<PostList showAllTags={true} />} />
              <Route path="tag/:tagName" element={<PostList />} />
              <Route path="tag/:tagName/hot" element={<PostList filter="hot" />} />
              <Route path="tag/:tagName/new" element={<PostList filter="new" />} />
              <Route path="tag/:tagName/top" element={<PostList filter="top" />} />
              
              {/* Search routes */}
              <Route path="search" element={<SearchResults />} />
              
              {/* Community routes */}
              <Route path="communities" element={<PostList />} />
              <Route path="community/:name" element={<PostList />} />
              <Route path="community/:name/hot" element={<PostList filter="hot" />} />
              <Route path="community/:name/new" element={<PostList filter="new" />} />
              <Route path="community/:name/top" element={<PostList filter="top" />} />
            </Route>
            
            {/* Routes không cần MainLayout (fullscreen) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/create-post" element={<CreatePostPage />} />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="/profile" element={<UserProfile />} />
            
            {/* Fallback route */}
            <Route path="*" element={<MainLayout />}>
              <Route index element={<PostList />} />
            </Route>

            <Route path="/auth-test" element={<AuthTest />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;