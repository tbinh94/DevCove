// src/components/Header/Header.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Thêm ChevronDown cho dropdown
import { Bell, Plus, User, LogOut, Settings, Key, X, Menu, MessageSquare, FlaskConical, Bug, Trophy, ChevronDown } from 'lucide-react'; 
import apiService from '../../../services/api'; 
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css';

// Import các component con khác nếu cần
import NotificationManager from '../../Notification';
import CreatePost from '../../CreatePost';
import UnifiedSearch from '../../UnifiedSearch';
import Logo from '../../../assets/imgs/logo.svg';

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // State để lưu profile cho header, tách biệt với context
  const [headerProfile, setHeaderProfile] = useState(null); 
  
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false); // NEW: State cho Tools dropdown
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const userMenuRef = useRef(null);
  const toolsMenuRef = useRef(null); // NEW: Ref cho Tools dropdown

  // useEffect để lấy profile y hệt UserProfile.jsx
  useEffect(() => {
    // Nếu không có user (đã logout), reset profile
    if (!user?.username) {
      setHeaderProfile(null);
      return;
    }

    // Gọi API để lấy profile đầy đủ
    const fetchHeaderProfile = async () => {
      try {
        const response = await apiService.getUserProfile(user.username);
        // Lưu chỉ đối tượng profile vào state của header
        setHeaderProfile(response.profile);
      } catch (error) {
        console.error("Header: Failed to fetch profile data.", error);
        setHeaderProfile(null); // Reset nếu có lỗi
      }
    };

    fetchHeaderProfile();
  }, [user?.username]); // Chỉ chạy lại khi username của người dùng thay đổi

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

  const handleCreatePostClick = () => {
    if (isAuthenticated) {
      setIsCreatePostOpen(true);
    } else {
      navigate('/login');
    }
  };

  const handleCreatePostClose = () => {
    setIsCreatePostOpen(false);
  };

  // NEW: Handlers cho Tools dropdown
  const handleChatClick = (e) => {
    e.preventDefault();
    navigate('/chat');
    setIsToolsMenuOpen(false);
  };
  
  const handleSandboxClick = () => {
    navigate('/sandbox');
    setIsToolsMenuOpen(false);
  };

  const handleBugTrackerClick = () => {
    navigate('/bug-tracker');
    setIsToolsMenuOpen(false);
  };

  const handleGenerateChallengeClick = () => {
    navigate('/challenge-generator');
    setIsToolsMenuOpen(false);
  };

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (isCreatePostOpen) {
          setIsCreatePostOpen(false);
        }
        if (isToolsMenuOpen) {
          setIsToolsMenuOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [isCreatePostOpen, isToolsMenuOpen]);

  // Component UserAvatar không cần thay đổi
  const UserAvatar = ({ user, profile, className }) => {
    const avatarUrl = profile?.avatar_url;
    return (
      <div className={className}>
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            className={styles.avatarImg}
            alt={`${user?.username}'s avatar`}
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) {
                  e.target.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}
        <div 
          className={styles.defaultAvatarFallback}
          style={avatarUrl ? { display: 'none' } : {}}
        >
          {user?.username?.charAt(0)?.toUpperCase() || '?'}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          {/* Mobile Menu Toggle and Logo */}
          <div className={styles.leftSection}>
            <button
              onClick={onToggleSidebar}
              className={styles.mobileMenuButton}
              aria-label="Toggle sidebar"
            >
              <Menu className={styles.buttonIcon} />
            </button>

            <div className={styles.logoWrapper}>
              <div 
                className={styles.logoLink} 
                onClick={() => window.location.href = 'http://localhost:3000'}
                style={{ cursor: 'pointer' }}
              >
                <img src={Logo} alt="DevCove Logo" className={styles.logoIcon} />
                <span className={styles.logoText}>DevCove</span>
              </div>
            </div>
          </div>

          <div className={styles.searchBar}>
            <UnifiedSearch />
          </div>

          <div className={styles.rightSide}>
            {isAuthenticated && user ? (
              <>
                {/* Primary Action - Create Post */}
                <button
                  onClick={handleCreatePostClick}
                  className={styles.createPostButton}
                  title="Create a new post"
                >
                  <Plus className={styles.buttonIcon} />
                  <span className={styles.createPostButtonText}>Create</span>
                </button>
                
                {/* NEW: Developer Tools Dropdown */}
                <div className={styles.toolsMenu} ref={toolsMenuRef}>
                  <button
                    onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                    className={styles.toolsMenuButton}
                    title="Developer Tools"
                  >
                    <FlaskConical className={styles.buttonIcon} />
                    <span className={styles.toolsMenuButtonText}>Tools</span>
                    <ChevronDown className={`${styles.buttonIcon} ${styles.dropdownChevron} ${isToolsMenuOpen ? styles.dropdownChevronOpen : ''}`} />
                  </button>

                  {isToolsMenuOpen && (
                    <div className={styles.toolsDropdownMenu}>
                      <button onClick={handleChatClick} className={styles.toolsDropdownItem}>
                        <MessageSquare className={styles.dropdownIcon} />
                        <span>Chat</span>
                      </button>
                      
                      <button onClick={handleSandboxClick} className={styles.toolsDropdownItem}>
                        <FlaskConical className={styles.dropdownIcon} />
                        <span>Code Sandbox</span>
                      </button>
                      
                      <button onClick={handleBugTrackerClick} className={styles.toolsDropdownItem}>
                        <Bug className={styles.dropdownIcon} />
                        <span>Bug Tracker</span>
                      </button>
                      
                      <button onClick={handleGenerateChallengeClick} className={styles.toolsDropdownItem}>
                        <Trophy className={styles.dropdownIcon} />
                        <span>Challenges</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.notificationWrapper}>
                  <NotificationManager />
                </div>

                <div className={styles.userMenu} ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={styles.userMenuButton}
                    title={`User menu for ${user.username}`}
                  >
                    <span className={styles.userMenuButtonText}>
                      Hello, {user.username}
                    </span>
                    <UserAvatar user={user} profile={headerProfile} className={styles.avatarSm} />
                    <span className={styles.dropdownArrow}>
                      {isUserMenuOpen ? '▲' : '▼'}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <div className={styles.userDropdownMenu}>
                      <div className={styles.userDropdownHeader}>
                        <div className={styles.userDropdownUsername}>
                          <User className={styles.dropdownIcon} />
                          {user?.username || 'User'}
                        </div>
                        <div className={styles.userDropdownKarma}>
                          Karma: {user?.karma || 0}
                        </div>
                      </div>
                      
                      <button onClick={() => { navigate(`/profile/${user?.username}`); setIsUserMenuOpen(false); }} className={styles.userDropdownItem}>
                        <User className={styles.dropdownIcon} />
                        <span>Profile</span>
                      </button>
                      
                      <button onClick={() => { navigate('/settings'); setIsUserMenuOpen(false); }} className={styles.userDropdownItem}>
                        <Settings className={styles.dropdownIcon} />
                        <span>Settings</span>
                      </button>

                      <button onClick={() => { navigate('/change-password'); setIsUserMenuOpen(false); }} className={styles.userDropdownItem}>
                        <Key className={styles.dropdownIcon} />
                        <span>Change Password</span>
                      </button>
                      
                      <hr className={styles.separator} />
                      
                      <button onClick={handleLogout} disabled={isLoading} className={`${styles.userDropdownItem} ${styles.userDropdownItemRed} ${isLoading ? styles.userDropdownItemDisabled : ''}`}>
                        <LogOut className={styles.dropdownIcon} />
                        <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.authButtons}>
                <button onClick={() => navigate('/login')} className={styles.loginButton}>Login</button>
                <button onClick={() => navigate('/register')} className={styles.signUpButton}>Sign Up</button>
                <button onClick={handleCreatePostClick} className={styles.createPostButton} title="Create a post (requires login)">
                  <Plus className={styles.buttonIcon} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isCreatePostOpen && (
        <div className={styles.modalOverlay} onClick={handleCreatePostClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <button onClick={handleCreatePostClose} className={styles.modalCloseButton} title="Close modal">
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <CreatePost isAuthenticated={isAuthenticated} onPostCreated={handleCreatePostClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;