import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, User, LogOut, Settings, Key, X } from 'lucide-react';
import defaultAvatar from '../../../assets/imgs/avatar-default.png';
import RedditLogo from '../../../assets/imgs/reddit-svgrepo-com.svg';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css';
import DefaultAvatar from '../../../assets/imgs/avatar-default.png';
import NotificationManager from '../../Notification';
import CreatePost from '../../CreatePost';
import UnifiedSearch from '../../UnifiedSearch';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  
  const userMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Create Post button click
  const handleCreatePostClick = () => {
    setIsCreatePostOpen(true);
  };

  // Handle Create Post modal close
  const handleCreatePostClose = () => {
    setIsCreatePostOpen(false);
  };

  // Click outside handler for user menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isCreatePostOpen) {
        setIsCreatePostOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isCreatePostOpen]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* Logo */}
          <div className={styles.logoWrapper}>
            <Link
              className={styles.logoLink}
              to="/"
            >
              <img src={RedditLogo} alt="Reddit Logo" className={styles.logoIcon} />
              <span className={styles.logoText}>DevCove</span>
            </Link>
          </div>

          {/* Unified Search Bar */}
          <div className={styles.searchBar}>
            <UnifiedSearch />
          </div>

          {/* Right Side - User Actions */}
          <div className={styles.rightSide}>
            {isAuthenticated ? (
              <>
                {/* Create Post Button */}
                <button
                  onClick={handleCreatePostClick}
                  className={styles.createPostButton}
                >
                  <Plus className={styles.buttonIcon} />
                  <span className={styles.createPostButtonText}>Create Post</span>
                </button>

                {/* Notifications */}
                <NotificationManager />

                {/* User Menu */}
                <div className={styles.userMenu} ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={styles.userMenuButton}
                  >
                    <span className={styles.userMenuButtonText}>Hello, {user.username}</span>
                    <img 
                      src={DefaultAvatar} 
                      className={styles.logoIcon}
                      alt={user.username || 'User'} 
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

      {/* Create Post Modal */}
      {isCreatePostOpen && (
        <div className={styles.modalOverlay} onClick={handleCreatePostClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create a Post</h2>
              <button 
                onClick={handleCreatePostClose}
                className={styles.modalCloseButton}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <CreatePost 
                isAuthenticated={isAuthenticated} 
                onPostCreated={handleCreatePostClose}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;