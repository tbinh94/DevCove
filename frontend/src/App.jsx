// App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import "react-datepicker/dist/react-datepicker.css";
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
import BugTracker from './components/admin/BugTracker';
import ChallengeGenerator from './components/admin/ChallengeGenerator';
import ChallengeDetail from './components/admin/ChallengeDetail';
import SubmissionReview from './components/admin/SubmissionReview';
// =====>>>>> IMPORT COMPONENT MỚI <<<<<=====
import CodeQualityAudit from './components/admin/CodeQualityAudit'; 

// Main App Component
const App = () => {
  useEffect(() => {
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
            {/* ... (các route công khai khác không đổi) ... */}
            <Route index element={<PostList />} />
            <Route path="hot" element={<PostList filter="hot" />} />
            <Route path="new" element={<PostList filter="new" />} />
            <Route path="top" element={<PostList filter="top" />} />
            <Route path="posts" element={<PostList />} />
            <Route path="tags" element={<PostList showAllTags={true} />} />
            <Route path="tag/:tagName" element={<PostList />} />
            {/* ... */}
            // <Route path="search" element={<SearchResults />} />
            {/* ... */}
            <Route path="communities" element={<PostList />} />
            <Route path="community/:name" element={<PostList />} />
            {/* ... */}

            <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
            
            {/* =====>>>>> NHÓM CÁC ROUTE ADMIN LẠI VỚI NHAU <<<<<===== */}
            <Route 
                path="admin/review/:submissionId" 
                element={
                  <AdminRoute>
                    <SubmissionReview />
                  </AdminRoute>
                } 
            />
            {/* Sử dụng MainLayout cho các trang admin để có sidebar và header */}
            <Route 
              path="admin/bug-tracker" 
              element={
                <AdminRoute>
                  <BugTracker />
                </AdminRoute>
              } 
            />
            <Route 
              path="admin/challenge-generator" 
              element={
                <AdminRoute>
                  <ChallengeGenerator />
                </AdminRoute>
              } 
            />
            {/* =====>>>>> THÊM ROUTE MỚI Ở ĐÂY <<<<<===== */}
            <Route 
              path="admin/code-audit" // URL mới cho trang audit
              element={
                <AdminRoute>
                  <CodeQualityAudit />
                </AdminRoute>
              } 
            />

          </Route>
          
          {/* Routes không cần MainLayout (fullscreen) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/post/:postId" element={<PostDetail />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/chat" element={<Chatting />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          
          {/* XÓA CÁC ROUTE ADMIN BỊ LẶP Ở ĐÂY VÀ CHUYỂN VÀO TRONG MainLayout */}
          
          {/* User Profile routes */}
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/:username" element={<UserProfile />} />
          
          {/* Settings routes */}
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