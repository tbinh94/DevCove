import React, { useState } from 'react';
import { User, MessageCircle, ArrowUp, UserPlus, BellOff, Trash2 } from 'lucide-react';
import styles from './NotificationsPage.module.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      sender: {
        username: 'john_doe',
        profile: {
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
        }
      },
      notification_type: 'comment',
      message: 'commented on your post',
      post: {
        id: 1,
        title: 'How to build a Reddit clone with Django and React'
      },
      created_at: '2024-01-15T10:30:00Z',
      is_read: false
    },
    {
      id: 2,
      sender: {
        username: 'jane_smith',
        profile: {
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9fd3b7e?w=100&h=100&fit=crop&crop=face'
        }
      },
      notification_type: 'vote',
      message: 'upvoted your post',
      post: {
        id: 2,
        title: 'Best practices for React development'
      },
      created_at: '2024-01-15T09:15:00Z',
      is_read: false
    },
    {
      id: 3,
      sender: {
        username: 'bob_wilson',
        profile: {
          avatar: null
        }
      },
      notification_type: 'follow',
      message: 'started following you',
      post: null,
      created_at: '2024-01-15T08:45:00Z',
      is_read: true
    },
    {
      id: 4,
      sender: {
        username: 'alice_johnson',
        profile: {
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
        }
      },
      notification_type: 'comment',
      message: 'replied to your comment',
      post: {
        id: 3,
        title: 'Understanding JavaScript closures and scope'
      },
      created_at: '2024-01-15T07:20:00Z',
      is_read: true
    }
  ]);

  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours`;
    return `${Math.floor(diffInSeconds / 86400)} days`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment': return <MessageCircle size={14} />;
      case 'vote': return <ArrowUp size={14} />;
      case 'follow': return <UserPlus size={14} />;
      default: return null;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true;
    return notification.notification_type === filterType;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getFilterCounts = () => {
    return {
      all: notifications.length,
      comment: notifications.filter(n => n.notification_type === 'comment').length,
      vote: notifications.filter(n => n.notification_type === 'vote').length,
      follow: notifications.filter(n => n.notification_type === 'follow').length
    };
  };

  const filterCounts = getFilterCounts();

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const clearAllNotifications = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
    }
  };

  const markNotificationAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
  };

  const deleteNotification = (id) => {
    if (window.confirm('Delete this notification?')) {
      setNotifications(notifications.filter(n => n.id !== id));
    }
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className={styles.notificationPage}>
      <div className={styles.notificationHeader}>
        <h1>Notifications</h1>
        <div className={styles.notificationActions}>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            >
              Mark All Read
            </button>
          )}
          <button 
            onClick={clearAllNotifications}
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.notificationFilters}>
        <button 
          onClick={() => setFilterType('all')}
          className={`${styles.filterTab} ${filterType === 'all' ? styles.active : ''}`}
        >
          All ({filterCounts.all})
        </button>
        <button 
          onClick={() => setFilterType('comment')}
          className={`${styles.filterTab} ${filterType === 'comment' ? styles.active : ''}`}
        >
          Comments ({filterCounts.comment})
        </button>
        <button 
          onClick={() => setFilterType('vote')}
          className={`${styles.filterTab} ${filterType === 'vote' ? styles.active : ''}`}
        >
          Votes ({filterCounts.vote})
        </button>
        <button 
          onClick={() => setFilterType('follow')}
          className={`${styles.filterTab} ${filterType === 'follow' ? styles.active : ''}`}
        >
          Follows ({filterCounts.follow})
        </button>
      </div>

      {/* Notifications list */}
      <div className={styles.notificationsContainer}>
        {paginatedNotifications.length > 0 ? (
          paginatedNotifications.map(notification => (
            <div 
              key={notification.id} 
              className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
            >
              <div className={styles.notificationContent}>
                <div className={styles.notificationAvatar}>
                  {notification.sender.profile.avatar ? (
                    <img 
                      src={notification.sender.profile.avatar} 
                      alt={notification.sender.username}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      <User size={20} />
                    </div>
                  )}
                </div>
                
                <div className={styles.notificationBody}>
                  <div className={styles.notificationHeaderInfo}>
                    <strong>{notification.sender.username}</strong>
                    <span className={styles.notificationType}>
                      {getNotificationIcon(notification.notification_type)}
                    </span>
                    <span className={styles.notificationTime}>
                      {getTimeAgo(notification.created_at)} ago
                    </span>
                  </div>
                  
                  <div className={styles.notificationMessage}>
                    {notification.message}
                  </div>
                  
                  {notification.post && (
                    <div className={styles.notificationPost}>
                      <a href={`/posts/${notification.post.id}`} className={styles.postLink}>
                        "{truncateText(notification.post.title, 60)}"
                      </a>
                    </div>
                  )}
                </div>
                
                <div className={styles.notificationActions}>
                  {!notification.is_read && (
                    <button 
                      onClick={() => markNotificationAsRead(notification.id)}
                      className={`${styles.btn} ${styles.btnSm} ${styles.btnOutlinePrimary}`}
                    >
                      Mark Read
                    </button>
                  )}
                  
                  <button 
                    onClick={() => deleteNotification(notification.id)}
                    className={`${styles.btn} ${styles.btnSm} ${styles.btnOutlineDanger}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noNotifications}>
            <BellOff size={48} />
            <p>No notifications found.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <div className={styles.pagination}>
            {currentPage > 1 && (
              <button 
                onClick={() => setCurrentPage(currentPage - 1)}
                className={styles.paginationBtn}
              >
                « Previous
              </button>
            )}
            
            <span className={styles.pageInfo}>
              Page {currentPage} of {totalPages}
            </span>
            
            {currentPage < totalPages && (
              <button 
                onClick={() => setCurrentPage(currentPage + 1)}
                className={styles.paginationBtn}
              >
                Next »
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;