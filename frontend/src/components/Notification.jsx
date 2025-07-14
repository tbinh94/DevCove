import React, { useState, useEffect, useRef } from 'react';

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
    <div ref={dropdownRef} className="notification-container">
      <button 
        className="notification-toggle"
        onClick={toggleDropdown}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>
      
      {isDropdownOpen && (
        <div className="notification-dropdown show">
          <div className="notification-header">
            <h6>Notifications</h6>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <ul className="notifications-list">
            {isLoading ? (
              <li className="dropdown-item text-center">Loading...</li>
            ) : notifications.length === 0 ? (
              <li className="dropdown-item text-center text-muted p-3">
                No new notifications
              </li>
            ) : (
              notifications.map((notification, index) => (
                <li key={index}>
                  <a 
                    className={`dropdown-item notification-item ${
                      !notification.is_read ? 'notification-unread' : ''
                    }`}
                    href={notification.action_url}
                  >
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-0 small">
                          <strong>{notification.sender}</strong>{' '}
                          {getNotificationText(notification.type)}
                        </p>
                        <small className="text-muted">
                          {formatTime(notification.created_at)}
                        </small>
                      </div>
                      {!notification.is_read && (
                        <span className="notification-dot ms-auto"></span>
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