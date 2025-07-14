import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, User, LogOut, Settings, Key } from 'lucide-react'; // Import Key for Change Password
import defaultAvatar from '../../../assets/imgs/avatar-default.png';
import apiService from '../../../services/api'; // Assume this path is correct
import RedditLogo from '../../../assets/imgs/reddit-svgrepo-com.svg'; // Điều chỉnh đường dẫn tương đối cho đúng

// Import CSS Module
import styles from './Header.module.css'; //

// Utility function to get CSRF token
const getCSRFToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]');
  return token ? token.getAttribute('content') : '';
};

// Mock authentication hook - In a real app, you'd get this from Context or Redux
const useAuth = () => ({
  isAuthenticated: true,
  user: {
    username: 'betta', // Updated username to match image 2
    profile: {
      avatar: null // or '/path/to/real/avatar.png'
    },
    karma: 1234,
    post_count: 56
  }
});

const Header = () => {
  const { isAuthenticated, user } = useAuth();
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
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
      });

      if (response.ok) {
        localStorage.removeItem('user');
        navigate('/login'); 
      } else {
        console.error('Logout failed:', response.statusText);
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
    <header className={styles.header}> {/* Apply header style */}
      <div className={styles.container}> {/* Apply container style */}
        {/* Logo */}
        <div className={styles.logo}> {/* Apply logo style */}
          <Link
            className={styles.logo} // Re-apply logo style to Link for cursor and flex
            to="/"
          >
            {/* Added Reddit icon placeholder */}
            <img src={RedditLogo} alt="Reddit Logo" className={styles.logoIcon} /> {/* Sử dụng biến RedditLogo */}
            <span className={styles.logoText}>Reddit Clone</span>
          </Link>
        </div>

        {/* Search Bar */}
        <div className={styles.searchBar} ref={searchRef}> {/* Apply search bar style */}
          <form onSubmit={handleSearchSubmit} className={styles.searchInputWrapper}> {/* Apply wrapper style */}
            <div className={styles.searchInputWrapper}> {/* Apply wrapper style */}
              <Search className={styles.searchIcon} /> {/* Apply search icon style */}
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search posts, users..."
                className={styles.searchInput} // Apply search input style
              />
            </div>
          </form>

          {/* Search Results Dropdown */}
          {isSearchFocused && (searchResults.posts.length > 0 || searchResults.users.length > 0 || isLoading) && (
            <div className={styles.searchResultsDropdown}> {/* Apply dropdown style */}
              {isLoading ? (
                <div className={styles.searchLoading}>Searching...</div> /* Corrected: Removed extra > after ? */
              ) : (
                <>
                  {/* Posts Results */}
                  {searchResults.posts.length > 0 && (
                    <div className="p-2"> {/* Keep padding for inner section */}
                      <h3 className={styles.searchSectionTitle}>Posts</h3> {/* Apply section title style */}
                      {searchResults.posts.map((post) => (
                        <div
                          key={`post-${post.id}`}
                          className={styles.searchItem} // Apply search item style
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
                    <div className="p-2 border-t border-gray-100"> {/* Keep padding and border */}
                      <h3 className={styles.searchSectionTitle}>Users</h3> {/* Apply section title style */}
                      {searchResults.users.map((resultUser) => (
                        <div
                          key={`user-${resultUser.id}`}
                          className={styles.searchItem} // Apply search item style
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
        <div className={styles.rightSide}> {/* Apply right side style */}
          {isAuthenticated ? (
            <>
              {/* Create Post Button */}
              <button
                onClick={() => navigate('/create-post')}
                className={styles.createPostButton} // Apply button style
              >
                <Plus className="h-4 w-4" />
                <span className={styles.createPostButtonText}>Create Post</span> {/* Apply text style if needed */}
              </button>

              {/* Notifications */}
              <button className={styles.notificationButton}> {/* Apply button style */}
                <Bell className="h-5 w-5" />
                <span className={styles.notificationBadge}>3</span> {/* Apply badge style */}
              </button>

              {/* User Menu */}
              <div className={styles.userMenu} ref={userMenuRef}> {/* Apply user menu style */}
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={styles.userMenuButton} // Apply button style
                >
                  {/* Changed to "Hello, betta" text with arrow icon as in image 2 */}
                  <span className="font-bold text-gray-700">Hello, {user.username}</span>
                  <img 
                    src={user.profile.avatar || defaultAvatar} 
                    className={styles.avatarSm} // Apply avatar style
                    alt="avatar"
                    onError={(e) => {
                      e.target.src = defaultAvatar;
                    }}
                  />
                  {isUserMenuOpen ? <span className="ml-1">▲</span> : <span className="ml-1">▼</span>} {/* Up/down arrow */}
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className={styles.userDropdownMenu}> {/* Apply dropdown menu style */}
                    <div className={styles.userDropdownHeader}> {/* Apply header style */}
                      <div className={styles.userDropdownUsername}>
                        <User className="inline-block h-4 w-4 mr-2" /> {/* Icon before username */}
                        {user.username}
                      </div>
                      <div className={styles.userDropdownKarma}>Karma: {user.karma || 0}</div>
                    </div>
                    
                    <button
                      onClick={() => {
                        navigate(`/profile/${user.username}`);
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem} // Apply item style
                    >
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </button>
                    
                    {/* Communities Link - Adjusted to button for consistent styling with other items */}
                    <button 
                      onClick={() => {
                        navigate('/communities');
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <span className="h-4 w-4">👨‍👩‍👦‍👦</span>
                      <span>Communities</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem} // Apply item style
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        navigate('/change-password'); // Assuming this route exists
                        setIsUserMenuOpen(false);
                      }}
                      className={styles.userDropdownItem}
                    >
                      <Key className="h-4 w-4" /> {/* Use Key icon for Change Password */}
                      <span>Change Password</span>
                    </button>
                    
                    <hr className={styles.separator} /> {/* Apply separator style */}
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoading}
                      className={`${styles.userDropdownItem} ${styles.userDropdownItemRed} ${isLoading ? styles.userDropdownItemDisabled : ''}`} // Apply multiple styles
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Login/Register buttons for non-authenticated users */
            <div className={styles.authButtons}> {/* Apply auth buttons style */}
              <button
                onClick={() => navigate('/login')}
                className={styles.loginButton} // Apply login button style
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className={styles.signUpButton} // Apply sign up button style
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