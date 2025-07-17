import React, { useState, useEffect, useRef } from 'react';
import styles from './Notification.module.css';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const updateInterval = 30000;
  const countUrl = '/api/notifications/count/';
  const markAllReadUrl = '/api/notifications/mark-all-read/';

  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  };

  const updateNotificationCount = async () => {
    try {
      const response = await fetch(countUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setUnreadCount(data.count);
      
      if (isDropdownOpen) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(countUrl);
      if (!response.ok) throw new Error('Network response was not ok');
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
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setTimeout(() => setIsDropdownOpen(false), 500);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const toggleDropdown = () => {
    const newIsOpen = !isDropdownOpen;
    setIsDropdownOpen(newIsOpen);
    if (newIsOpen) {
      fetchNotifications();
    }
  };

  // --- CÁC HÀM HELPER ---

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

  // ✅ ĐÃ SỬA: Hàm tạo URL động từ dữ liệu notification
  const getNotificationUrl = (notification) => {
    switch (notification.type) {
      case 'comment':
      case 'vote':
        // Sửa ở đây: Đổi '/posts/' thành '/post/'
        return notification.post_id ? `/post/${notification.post_id}/` : '/';
      case 'follow':
        return notification.sender ? `/profile/${notification.sender.username}/` : '/';
      default:
        return '#';
    }
  };

  useEffect(() => {
    updateNotificationCount();
    const interval = setInterval(updateNotificationCount, updateInterval);
    return () => clearInterval(interval);
  }, []);

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
              notifications.map((notification) => (
                <li key={notification.id}>
                  <a 
                    className={`${styles.dropdownItem} ${styles.notificationItem} ${
                      !notification.is_read ? styles.notificationUnread : ''
                    }`}
                    href={getNotificationUrl(notification)}
                  >
                    <div className={`${styles.dFlex} ${styles.alignItemsCenter}`}>
                      <div className={`${styles.flexShrink0} ${styles.me3}`}>
                        <div className={styles.notificationIcon}>
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className={styles.flexGrow1}>
                        <p className={`${styles.mb0} ${styles.small}`}>
                          <strong>{notification.sender?.username || 'Someone'}</strong>{' '}
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