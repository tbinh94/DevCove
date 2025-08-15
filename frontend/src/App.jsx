import React, { useEffect } from 'react'; // Thêm useEffect
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// ✅ Import AdminRoute từ AuthContext
import { AuthProvider, AdminRoute } from './contexts/AuthContext';
import apiService from './services/api';
// Import components
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import SearchResults from './components/SearchResults';
import CreatePost from './components/CreatePost';
import PostDetail from './components/PostDetail';
import PostList from './components/PostList';
import UserProfile from './components/UserProfile';
import { Header, Footer, MainLayout, Sidebar } from './components/common/layout';
import Settings from './components/users/Settings'; 
import PasswordChange from './components/users/PasswordChange'; 
import AuthTest from './AuthTest';
import Chatting from './components/Chatting';
import SandboxPage from './components/pages/SandboxPage/SandboxPage';
import BugTracker from './components/BugTracker'; // Trang mới chứa CommunityBugTracker
import ChallengeGenerator from './components/ChallengeGenerator';
import ChallengeDetail from './components/ChallengeDetail';
// Main App Component
const App = () => {
  useEffect(() => {
    // Tự động khởi tạo CSRF token khi ứng dụng được tải
    // Điều này đảm bảo mọi request POST/PUT/DELETE sau này đều sẽ có token
    apiService.utils.initCSRF();
  }, [])
  document.body.classList.add('dark-theme');
  return (
  <AuthProvider>
    <Router>
      <div>
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

            <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />

          </Route>
          
          {/* Routes không cần MainLayout (fullscreen) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/post/:postId" element={<PostDetail />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/chat" element={<Chatting />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          
          {/* ✅ BẢO VỆ ROUTE /bug-tracker BẰNG AdminRoute */}
          <Route 
            path="/bug-tracker" 
            element={
              <AdminRoute>
                <BugTracker />
              </AdminRoute>
            } 
          />
          <Route 
              path="/challenge-generator" 
              element={
                <AdminRoute>
                  <ChallengeGenerator />
                </AdminRoute>
              } 
          />
          
          {/* User Profile routes */}
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/:username" element={<UserProfile />} />
          
          {/* Settings routes - có thể cần authentication wrapper */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/change-password" element={<PasswordChange />} />
          
          {/* Development/Test routes */}
          <Route path="/auth-test" element={<AuthTest />} />
          
          {/* Fallback route */}
          <Route path="*" element={<MainLayout />}>
            <Route index element={<PostList />} />
          </Route>
        </Routes>
      </div>
    </Router>
  </AuthProvider>
);
};

export default App;