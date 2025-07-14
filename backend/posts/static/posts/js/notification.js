class NotificationManager {
    constructor() {
        this.updateInterval = 30000; // 30 giây
        this.countUrl = '/notifications/count/';
        this.markAllReadUrl = '/notifications/mark-all-read/';
        this.init();
    }

    init() {
        this.updateNotificationCount();
        setInterval(() => this.updateNotificationCount(), this.updateInterval);
        this.bindEvents(); // Quan trọng: Gọi hàm bindEvents
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    updateNotificationCount() {
        fetch(this.countUrl)
            .then(response => response.json())
            .then(data => {
                const badge = document.querySelector('.notification-badge');
                if (badge) {
                    if (data.count > 0) {
                        badge.textContent = data.count;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
                // Chỉ cập nhật dropdown nếu nó đang mở
                const dropdown = document.querySelector('.notification-dropdown');
                if (dropdown && dropdown.classList.contains('show')) {
                    this.updateNotificationDropdown(data.notifications);
                }
            })
            .catch(error => console.error('Error fetching notifications:', error));
    }

    updateNotificationDropdown(notifications) {
        const notificationsContainer = document.querySelector('.notifications-list');
        if (!notificationsContainer) return;

        notificationsContainer.innerHTML = ''; // Xóa list cũ

        if (notifications.length === 0) {
            notificationsContainer.innerHTML = `<li class="dropdown-item text-center text-muted p-3">No new notifications</li>`;
            return;
        }

        notifications.forEach(notification => {
            const notificationItem = this.createNotificationItem(notification);
            notificationsContainer.appendChild(notificationItem);
        });
    }

    createNotificationItem(notification) {
        const li = document.createElement('li');
        li.innerHTML = `
            <a class="dropdown-item notification-item ${!notification.is_read ? 'notification-unread' : ''}" 
               href="${notification.action_url}">
                <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 me-3">
                        <div class="notification-icon">${this.getNotificationIcon(notification.type)}</div>
                    </div>
                    <div class="flex-grow-1">
                        <p class="mb-0 small">
                            <strong>${notification.sender}</strong> 
                            ${this.getNotificationText(notification.type)}
                        </p>
                        <small class="text-muted">${this.formatTime(notification.created_at)}</small>
                    </div>
                    ${!notification.is_read ? '<span class="notification-dot ms-auto"></span>' : ''}
                </div>
            </a>`;
        return li;
    }

    getNotificationIcon(type) {
        const icons = { 'comment': '💬', 'vote': '👍', 'follow': '➕' };
        return icons[type] || '🔔';
    }

    getNotificationText(type) {
        const typeMap = {
            'comment': 'commented on your post.',
            'vote': 'upvoted your post.',
            'follow': 'started following you.',
        };
        return typeMap[type] || 'sent you a notification.';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date; // in milliseconds
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    // ===============================================================
    // PHẦN ĐƯỢC THÊM VÀO ĐỂ SỬA LỖI
    // ===============================================================
    bindEvents() {
        const notificationToggle = document.querySelector('.notification-toggle');
        const markAllReadBtn = document.querySelector('.mark-all-read');

        // 1. Thêm sự kiện click cho nút chuông
        if (notificationToggle) {
            notificationToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleNotificationDropdown();
            });
        }

        // 2. Sự kiện cho nút "Mark all as read"
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.markAllAsRead();
            });
        }

        // 3. Đóng dropdown khi click ra ngoài
        document.addEventListener('click', (e) => {
            const dropdown = document.querySelector('.notification-dropdown');
            if (dropdown && dropdown.classList.contains('show') && !notificationToggle.contains(e.target)) {
                 dropdown.classList.remove('show');
            }
        });
    }

    toggleNotificationDropdown() {
        const dropdown = document.querySelector('.notification-dropdown');
        if (!dropdown) return;

        const isVisible = dropdown.classList.toggle('show');

        // Tải lại danh sách notification mỗi khi mở dropdown
        if (isVisible) {
            this.updateNotificationDropdown([]); // Xóa tạm để hiện loading
            this.fetchAndShowNotifications();
        }
    }
    
    // Hàm mới để tải và hiển thị notification khi mở dropdown
    fetchAndShowNotifications() {
        fetch(this.countUrl)
            .then(response => response.json())
            .then(data => {
                this.updateNotificationDropdown(data.notifications);
            })
            .catch(error => {
                console.error('Error fetching notifications for dropdown:', error);
                const notificationsContainer = document.querySelector('.notifications-list');
                if(notificationsContainer) {
                    notificationsContainer.innerHTML = `<li class="dropdown-item text-center text-danger">Could not load</li>`;
                }
            });
    }
    // ===============================================================

    markAllAsRead() {
        fetch(this.markAllReadUrl, {
            method: 'POST',
            headers: { 'X-CSRFToken': this.getCSRFToken(), 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.updateNotificationCount();
                this.toggleNotificationDropdown(); // Đóng dropdown sau khi thực hiện
            }
        })
        .catch(error => console.error('Error marking all as read:', error));
    }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    window.notificationManager = new NotificationManager();
});