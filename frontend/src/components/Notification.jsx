import React, { useState, useEffect, useRef } from 'react';
import styles from './Notification.module.css';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const updateInterval = 30000; // 30 seconds
  const countUrl = '/notifications/count/';
  const markAllReadUrl = '/notifications/mark-all-read/';

  // Get CSRF token
  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  };

  // Fetch notification count
  const updateNotificationCount = async () => {
    try {
      const response = await fetch(countUrl);
      const data = await response.json();
      setUnreadCount(data.count);
      
      // Only update dropdown if it's open
      if (isDropdownOpen) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch notifications for dropdown
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(countUrl);
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(markAllReadUrl, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setUnreadCount(0);
        setNotifications([]);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen) {
      fetchNotifications();
    }
  };

  // Helper functions
  const getNotificationIcon = (type) => {
    const icons = { 'comment': '💬', 'vote': '👍', 'follow': '➕' };
    return icons[type] || '🔔';
  };

  const getNotificationText = (type) => {
    const typeMap = {
      'comment': 'commented on your post.',
      'vote': 'upvoted your post.',
      'follow': 'started following you.',
    };
    return typeMap[type] || 'sent you a notification.';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Auto-update notifications
  useEffect(() => {
    updateNotificationCount();
    const interval = setInterval(updateNotificationCount, updateInterval);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={styles.notificationContainer}>
      <button 
        className={styles.notificationToggle}
        onClick={toggleDropdown}
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>{unreadCount}</span>
        )}
      </button>
      
      {isDropdownOpen && (
        <div className={`${styles.notificationDropdown} ${styles.show}`}>
          <div className={styles.notificationHeader}>
            <h6>Notifications</h6>
            {unreadCount > 0 && (
              <button 
                className={styles.markAllRead}
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <ul className={styles.notificationsList}>
            {isLoading ? (
              <li className={`${styles.dropdownItem} ${styles.textCenter}`}>Loading...</li>
            ) : notifications.length === 0 ? (
              <li className={`${styles.dropdownItem} ${styles.textCenter} ${styles.textMuted} ${styles.p3}`}>
                No new notifications
              </li>
            ) : (
              notifications.map((notification, index) => (
                <li key={index}>
                  <a 
                    className={`${styles.dropdownItem} ${styles.notificationItem} ${
                      !notification.is_read ? styles.notificationUnread : ''
                    }`}
                    href={notification.action_url}
                  >
                    <div className={`${styles.dFlex} ${styles.alignItemsCenter}`}>
                      <div className={`${styles.flexShrink0} ${styles.me3}`}>
                        <div className={styles.notificationIcon}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className={styles.flexGrow1}>
                        <p className={`${styles.mb0} ${styles.small}`}>
                          <strong>{notification.sender}</strong>{' '}
                          {getNotificationText(notification.type)}
                        </p>
                        <small className={styles.textMuted}>
                          {formatTime(notification.created_at)}
                        </small>
                      </div>
                      {!notification.is_read && (
                        <span className={`${styles.notificationDot} ${styles.msAuto}`}></span>
                      )}
                    </div>
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationManager;