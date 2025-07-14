// AuthTest.js - Component to test authentication

import React, { useState, useEffect } from 'react';
import api from './services/api';

const AuthTest = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Test login credentials
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const response = await api.auth.checkAuth();
      
      if (response.isAuthenticated) {
        setUser(response.user);
        console.log('User authenticated:', response.user);
        
        // Test loading posts
        await loadPosts();
        
        // Test loading notifications
        await loadNotifications();
      } else {
        setUser(null);
        console.log('User not authenticated');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const postsData = await api.posts.getPosts();
      setPosts(postsData.results || postsData || []);
      console.log('Posts loaded:', postsData);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError(`Posts error: ${err.message}`);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsData = await api.notifications.getNotifications();
      setNotifications(notificationsData.results || notificationsData || []);
      console.log('Notifications loaded:', notificationsData);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      // Don't set error for notifications as they might not be critical
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.auth.login(loginData);
      console.log('Login successful:', response);
      
      await checkAuth(); // Re-check auth status
    } catch (err) {
      console.error('Login failed:', err);
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await api.auth.logout();
      setUser(null);
      setPosts([]);
      setNotifications([]);
      console.log('Logout successful');
    } catch (err) {
      console.error('Logout failed:', err);
      setError(`Logout failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCSRF = async () => {
    try {
      await api.utils.initCSRF();
      console.log('CSRF token initialized');
    } catch (err) {
      console.error('CSRF test failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Authentication Test</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Authentication Test</h2>
      
      {error && (
        <div style={{ 
          background: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Error: {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Auth Status</h3>
        {user ? (
          <div>
            <p><strong>Logged in as:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>ID:</strong> {user.id}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div>
            <p>Not authenticated</p>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="text"
                  placeholder="Username"
                  value={loginData.username}
                  onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                  required
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                />
              </div>
              <button type="submit">Login</button>
            </form>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Tests</h3>
        <button onClick={testCSRF}>Test CSRF</button>
        <button onClick={loadPosts}>Reload Posts</button>
        <button onClick={loadNotifications}>Reload Notifications</button>
        <button onClick={checkAuth}>Check Auth</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Posts ({posts.length})</h3>
        {posts.length > 0 ? (
          <ul>
            {posts.slice(0, 5).map(post => (
              <li key={post.id}>
                <strong>{post.title}</strong> by {post.author}
                <br />
                <small>Score: {post.vote_score || 0} | Comments: {post.comment_count || 0}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No posts loaded</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Notifications ({notifications.length})</h3>
        {notifications.length > 0 ? (
          <ul>
            {notifications.slice(0, 5).map((notification, index) => (
              <li key={notification.id || index}>
                {notification.message || notification.content}
                <br />
                <small>Read: {notification.is_read ? 'Yes' : 'No'}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>No notifications</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Debug Info</h3>
        <p><strong>API Base URL:</strong> {process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api'}</p>
        <p><strong>CSRF Token:</strong> {document.cookie.includes('csrftoken') ? 'Present' : 'Missing'}</p>
        <p><strong>Session Cookie:</strong> {document.cookie.includes('sessionid') ? 'Present' : 'Missing'}</p>
      </div>
    </div>
  );
};

export default AuthTest;