function showAlert(message, type = 'info', callback = null, duration = 2000) {
    const $container = $('#custom-alert-container');
    const $alert     = $('#custom-alert');
    const $msg       = $('#custom-alert-message');
    
    // Cập nhật nội dung & kiểu
    $msg.html(message);  
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
    
    // Tự động ẩn
    setTimeout(() => {
      $container.addClass('hidden');
      if (callback) callback();
    }, duration);
}

// Hàm lấy CSRF token từ cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

$(document).ready(function() {
    console.log('Vote system initialized');

    if (!window.voteConfig) {
        console.error('voteConfig not found');
        return;
    }

    $('.vote-btn').click(function(e) {
        e.preventDefault();
        const btn = $(this);
        const postId = btn.data('id');
        const voteType = btn.data('dir');

        if (!window.voteConfig.isAuthenticated) {
            showAlert(
                `Please <a href="${window.voteConfig.loginUrl}">login</a> to vote!`,
                'warning',
                null,
                5000
            );
            return;
        }

        btn.prop('disabled', true);
        const csrfToken = getCookie('csrftoken');
        if (!csrfToken) {
            console.error('CSRF token not found');
            btn.prop('disabled', false);
            return;
        }

        $.ajax({
            url: window.voteConfig.voteUrl,
            method: 'POST',
            data: {
                post_id: postId,
                vote_type: voteType,
                csrfmiddlewaretoken: csrfToken
            },
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            success: function(data) {
                if (data.error) {
                    showAlert('Lỗi: ' + data.error, 'error', null, 3000);
                } else if (data.success) {
                    // Cập nhật điểm số và trạng thái nút với màu cam
                    $(`#score-${postId}`).text(data.score);
                    updateButtonStates(postId, voteType, data.action, data.score);
                }
            },
            error: function(xhr, status, error) {
                console.error('Vote error:', error);
                if (xhr.status === 403) {
                    showAlert(
                        `Phiên đăng nhập hết hạn. Vui lòng <a href="${window.voteConfig.loginUrl}">đăng nhập lại</a>`,
                        'error',
                        null,
                        5000
                    );
                } else {
                    showAlert('Có lỗi xảy ra khi vote. Vui lòng thử lại!', 'error', null, 3000);
                }
            },
            complete: function() {
                btn.prop('disabled', false);
            }
        });
    });

    // Hàm cập nhật trạng thái nút vote và màu sắc
    function updateButtonStates(postId, voteType, action, score) {
        const upBtn = $(`.vote-btn.upvote[data-id="${postId}"]`);
        const downBtn = $(`.vote-btn.downvote[data-id="${postId}"]`);
        const scoreEl = $(`#score-${postId}`);

        // Reset classes
        upBtn.removeClass('active voted-up voted-down');
        downBtn.removeClass('active voted-up voted-down');
        scoreEl.removeClass('positive negative');

        // Nếu không bỏ vote thì highlight
        if (action !== 'removed') {
            if (voteType === 'up') {
                upBtn.addClass('active voted-up');
            } else if (voteType === 'down') {
                downBtn.addClass('active voted-down');
            }
        }

        // Màu score
        if (score > 0) {
            scoreEl.addClass('positive');
        } else if (score < 0) {
            scoreEl.addClass('negative');
        }
    }

    // Khởi tạo trạng thái ban đầu nếu có dữ liệu từ server
    $('.post-card').each(function() {
        const card = $(this);
        const postId = card.find('.vote-btn').data('id');
        const userVote = card.data('user-vote');
        const score = parseInt(card.find('.score').text(), 10);
        if (userVote) {
            updateButtonStates(postId, userVote, 'init', score);
        }
    });
});

