import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Đảm bảo đã import
import apiService from '../services/api'; // ✅ Sử dụng apiService
import styles from './Notification.module.css';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate(); // ✅ Khởi tạo hook

  const updateInterval = 30000;

  // ✅ Sử dụng apiService để fetch dữ liệu
  const fetchNotificationsData = async (shouldShowLoading = false) => {
    if (shouldShowLoading) setIsLoading(true);
    try {
      const data = await apiService.getNotificationCountAndRecent();
      setUnreadCount(data.count);
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (shouldShowLoading) setNotifications([]);
    } finally {
      if (shouldShowLoading) setIsLoading(false);
    }
  };
  
  // ✅ Sử dụng apiService để đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      const data = await apiService.markAllNotificationsRead();
      if (data.success) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setTimeout(() => setIsDropdownOpen(false), 500);
      }
    } catch (error)      {
      console.error('Error marking all as read:', error);
    }
  };

  const toggleDropdown = () => {
    const newIsOpen = !isDropdownOpen;
    setIsDropdownOpen(newIsOpen);
    if (newIsOpen) {
      // Khi mở dropdown, fetch dữ liệu và hiển thị loading spinner
      fetchNotificationsData(true);
    }
  };
  
  // ✅ Sử dụng useNavigate để điều hướng, tránh reload trang
  const handleNotificationClick = (notification) => {
    // 1. Đánh dấu đã đọc ở client-side ngay lập tức để UI phản hồi nhanh
    if (!notification.is_read) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, is_read: true} : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        // 2. Gửi request đánh dấu đã đọc lên server (fire and forget)
        apiService.markNotificationRead(notification.id).catch(err => console.error("Failed to mark notification as read on server:", err));
    }
    // 3. Đóng dropdown và điều hướng
    setIsDropdownOpen(false);
    navigate(notification.action_url || '/');
  };

  // --- CÁC HÀM HELPER ---

  const getNotificationIcon = (type) => {
    const icons = { 
        'comment': '💬', 
        'vote': '👍', 
        'follow': '➕',
        'bot_analysis': '🤖',
        'challenge_submission': '🏆',
        'challenge_review': '✅'
    };
    return icons[type] || '🔔';
  };

  const getNotificationText = (type) => {
    const typeMap = {
      'comment': 'commented on your post.',
      'vote': 'upvoted your post.',
      'follow': 'started following you.',
      'bot_analysis': 'analyzed your post.',
      'challenge_submission': 'submitted a solution for a challenge.',
      'challenge_review': 'reviewed your challenge submission.' 
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
  
  // ✅ Xóa bỏ hàm getNotificationUrl vì chúng ta sẽ dùng action_url từ backend

  useEffect(() => {
    // Chỉ fetch count khi component mount lần đầu
    apiService.getNotificationCountAndRecent().then(data => setUnreadCount(data.count)).catch(err => console.error(err));
    
    // Vẫn giữ interval để cập nhật count trong nền
    const interval = setInterval(() => {
        apiService.getNotificationCountAndRecent().then(data => setUnreadCount(data.count)).catch(err => console.error(err));
    }, updateInterval);

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
                // ✅ SỬ DỤNG onClick VÀ THẺ li THAY VÌ <a> VÀ href
                <li key={notification.id} onClick={() => handleNotificationClick(notification)}>
                  <div 
                    className={`${styles.dropdownItem} ${styles.notificationItem} ${
                      !notification.is_read ? styles.notificationUnread : ''
                    }`}
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
                  </div>
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