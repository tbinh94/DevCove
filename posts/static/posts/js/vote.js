function showAlert(message, type = 'info', callback = null, duration = 2000) {
  const $container = $('#custom-alert-container');
  const $alert     = $('#custom-alert');
  const $msg       = $('#custom-alert-message');
  
  // Cập nhật nội dung & kiểu
  $msg.html(message);  // Thay .text() bằng .html() để hiển thị HTML
  $alert
    .removeClass('info success warning error')
    .addClass(type);
  
  // Hiện thông báo
  $container.removeClass('hidden');
  
  // Đóng khi nhấp nút
  $('#custom-alert-close').off('click').on('click', () => {
    $container.addClass('hidden');
    if (callback) callback();
  });
  
  // Tự động ẩn sau thời gian duration
  setTimeout(() => {
    $container.addClass('hidden');
    if (callback) callback();
  }, duration);
}

$(document).ready(function() {
    // Lấy CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                let cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Xử lý sự kiện nhấp nút vote
    $('.vote-btn').click(function(e) {
        e.preventDefault();
        
        const btn = $(this);
        const postId = btn.data('id');
        const voteType = btn.data('dir');

        // Kiểm tra cấu hình
        if (!window.voteConfig) {
            console.error('voteConfig not found');
            return;
        }

        // Kiểm tra trạng thái đăng nhập
        if (!window.voteConfig.isAuthenticated) {
            const loginMessage = 'Please <a href="' + window.voteConfig.loginUrl + '">login</a> to vote!';
            showAlert(loginMessage, 'warning', null, 5000);
            return;
        }

        // Kiểm tra dữ liệu
        if (!postId || !voteType) {
            console.error('Missing post ID or vote type');
            return;
        }

        // Vô hiệu hóa nút để tránh spam
        btn.prop('disabled', true);

        // Lấy CSRF token
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            console.error('CSRF token not found');
            btn.prop('disabled', false);
            return;
        }

        // Gửi yêu cầu AJAX
        $.ajax({
            url: window.voteConfig.voteUrl,
            method: 'POST',
            data: {
                'post_id': postId,
                'vote_type': voteType,
                'csrfmiddlewaretoken': csrfToken
            },
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                if (data.error) {
                    showAlert('Lỗi: ' + data.error, 'error', null, 3000);
                } else if (data.success && typeof data.score !== 'undefined') {
                    // Cập nhật điểm số
                    $('#score-' + postId).text(data.score);
                    
                    // Cập nhật trạng thái nút
                    updateButtonStates(postId, voteType, data.action);
                }
            },
            error: function(xhr, status, error) {
                console.error('Vote error:', error);
                
                if (xhr.status === 403) {
                    const loginMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng <a href="' + window.voteConfig.loginUrl + '">đăng nhập lại</a>.';
                    showAlert(loginMessage, 'error', null, 5000);
                } else {
                    showAlert('Có lỗi xảy ra khi vote. Vui lòng thử lại!', 'error', null, 3000);
                }
            },
            complete: function() {
                // Kích hoạt lại nút
                btn.prop('disabled', false);
            }
        });
    });

    // Cập nhật trạng thái nút vote
    function updateButtonStates(postId, voteType, action) {
        const upBtn = $(`.vote-btn.upvote[data-id="${postId}"]`);
        const downBtn = $(`.vote-btn.downvote[data-id="${postId}"]`);
        
        // Xóa lớp active khỏi tất cả nút
        upBtn.removeClass('active');
        downBtn.removeClass('active');
        
        // Nếu vote không bị xóa (toggle), thêm lớp active
        if (action !== 'removed') {
            if (voteType === 'up') {
                upBtn.addClass('active');
            } else if (voteType === 'down') {
                downBtn.addClass('active');
            }
        }
    }
});