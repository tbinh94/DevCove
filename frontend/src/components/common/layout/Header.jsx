import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, User, LogOut, Settings, Key } from 'lucide-react';
import defaultAvatar from '../../../assets/imgs/avatar-default.png';
import apiService from '../../../services/api';
import RedditLogo from '../../../assets/imgs/reddit-svgrepo-com.svg';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css'; // Import CSS Module

import NotificationManager from '../../Notification';


// Utility function to get CSRF token
const getCSRFToken = () => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, 'csrftoken'.length + 1) === ('csrftoken' + '=')) {
        cookieValue = decodeURIComponent(cookie.substring('csrftoken'.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Mock authentication hook - In a real app, you'd get this from Context or Redux
{/*
const useAuth = () => ({
  isAuthenticated: true,
  user: {
    username: 'betta',
    profile: {
      avatar: null
    },
    karma: 1234,
    post_count: 56
  }
});
*/}

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth(); // <-- Dùng hook thật
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ posts: [], users: [] });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults({ posts: [], users: [] });
      return;
    }

    try {
      setIsLoading(true);
      const results = await apiService.search(query); 
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ posts: [], users: [] });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // 2. THÊM DẤU / VÀO CUỐI ENDPOINT
      const response = await fetch('/api/auth/logout/', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(), // Hàm mới sẽ được gọi ở đây
        },
      });

      if (response.ok) {
        // Xóa thông tin user khỏi local storage nếu bạn có lưu
        localStorage.removeItem('user'); 
        // Điều hướng về trang login hoặc trang chủ
        window.location.href = '/login'; // Dùng window.location.href để refresh toàn bộ trang
      } else {
        const errorData = await response.json();
        console.error('Logout failed:', errorData);
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoading(false);
      setIsUserMenuOpen(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      const debounceTimer = setTimeout(() => {
        handleSearch(query);
      }, 300);
      
      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults({ posts: [], users: [] });
    }
  };

  const handleSearchResultClick = (type, id) => {
    if (type === 'post') {
      navigate(`/post/${id}`);
    } else if (type === 'user') {
      navigate(`/profile/${id}`);
    }
    setSearchQuery('');
    setSearchResults({ posts: [], users: [] });
    setIsSearchFocused(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchResults({ posts: [], users: [] });
      setIsSearchFocused(false);
    }
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
        setSearchResults({ posts: [], users: [] });
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logoWrapper}>
          <Link
            className={styles.logoLink}
            to="/"
          >
            <img src={RedditLogo} alt="Reddit Logo" className={styles.logoIcon} />
            <span className={styles.logoText}>Reddit Clone</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar} ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
            <div className={styles.searchInputContainer}>
              <Search className={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search posts, users..."
                className={styles.searchInput}
              />
            </div>
          </form>

          {/* Search Results Dropdown */}
          {isSearchFocused && (searchResults.posts.length > 0 || searchResults.users.length > 0 || isLoading) && (
            <div className={styles.searchResultsDropdown}>
              {isLoading ? (
                <div className={styles.searchLoading}>Searching...</div> 
              ) : (
                <>
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className={styles.searchSection}>
                      <h3 className={styles.searchSectionTitle}>Posts</h3>
                      {searchResults.posts.map((post) => (
                        <div
                          key={`post-${post.id}`}
                          className={styles.searchItem}
                          onClick={() => handleSearchResultClick('post', post.id)}
                        >
                          <div className={styles.searchItemTitle}>
                            {post.title}
                          </div>
                          <div className={styles.searchItemMeta}>
                            by {post.author} • {post.vote_score} points
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Users Results */}
                  {searchResults.users.length > 0 && (
                    <div className={`${styles.searchSection} ${styles.searchSectionBorderTop}`}>
                      <h3 className={styles.searchSectionTitle}>Users</h3>
                      {searchResults.users.map((resultUser) => (
                        <div
                          key={`user-${resultUser.id}`}
                          className={styles.searchItem}
                          onClick={() => handleSearchResultClick('user', resultUser.username)}
                        >
                          <div className={styles.searchItemTitle}>
                            u/{resultUser.username}
                          </div>
                          <div className={styles.searchItemMeta}>
                            {resultUser.karma} karma • {resultUser.post_count} posts
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.posts.length === 0 && searchResults.users.length === 0 && searchQuery.length >= 2 && (
                       <div className={styles.noResults}>No results found.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Side - User Actions */}
        <div className={styles.rightSide}>
          {isAuthenticated ? (
            <>
              {/* Create Post Button */}
              <button
                onClick={() => navigate('/create-post')}
                className={styles.createPostButton}
              >
                <Plus className={styles.buttonIcon} />
                <span className={styles.createPostButtonText}>Create Post</span>
              </button>

              {/* Notifications - Use NotificationManager directly */}
              <NotificationManager />

              {/* User Menu */}
              <div className={styles.userMenu} ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={styles.userMenuButton}
                >
                  <span className={styles.userMenuButtonText}>Hello, {user.username}</span>
                  <img 
                    src={user.profile.avatar || defaultAvatar} 
                    className={styles.avatarSm}
                    alt="avatar"
                    onError={(e) => {
                      e.target.src = defaultAvatar;
                    }}
                  />
                  {isUserMenuOpen ? <span className="ml-1">▲</span> : <span className="ml-1">▼</span>}
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className={styles.userDropdownMenu}>
                    <div className={styles.userDropdownHeader}>
                      <div className={styles.userDropdownUsername}>
                        <User className={styles.dropdownIcon} />
                        {user.username}
                      </div>
                      <div className={styles.userDropdownKarma}>Karma: {user.karma || 0}</div>
                    </div>
                    
                    <button
                      onClick={() => {
                        navigate(`/profile/${user.username}`);
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <User className={styles.dropdownIcon} />
                      <span>Profile</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        navigate('/communities');
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <span className={`${styles.dropdownIcon} ${styles.communityIcon}`}>👨‍👩‍👦‍👦</span>
                      <span>Communities</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <Settings className={styles.dropdownIcon} />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/change-password');
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <Key className={styles.dropdownIcon} />
                      <span>Change Password</span>
                    </button>
                    
                    <hr className={styles.separator} />
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoading}
                      className={`${styles.userDropdownItem} ${styles.userDropdownItemRed} ${isLoading ? styles.userDropdownItemDisabled : ''}`}
                    >
                      <LogOut className={styles.dropdownIcon} />
                      <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Login/Register buttons for non-authenticated users */
            <div className={styles.authButtons}>
              <button
                onClick={() => navigate('/login')}
                className={styles.loginButton}
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className={styles.signUpButton}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;