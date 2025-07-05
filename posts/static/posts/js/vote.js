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

    // Khởi tạo trạng thái vote khi trang load
    initializeVoteStates();

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
                    // Cập nhật điểm số và trạng thái nút
                    $(`#score-${postId}`).text(data.score);
                    updateButtonStates(postId, voteType, data.action, data.score);
                    
                    // Cập nhật data attribute cho vote section
                    const voteSection = $(`.vote-section:has([data-id="${postId}"])`);
                    if (data.action === 'removed') {
                        voteSection.attr('data-user-vote', '');
                    } else {
                        voteSection.attr('data-user-vote', voteType);
                    }
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

    // Hàm khởi tạo trạng thái vote từ server data
    function initializeVoteStates() {
        $('.vote-section').each(function() {
            const voteSection = $(this);
            const userVote = voteSection.data('user-vote');
            const postId = voteSection.find('.vote-btn').first().data('id');
            const score = parseInt(voteSection.find('.score').text(), 10) || 0;
            
            console.log(`Vote section data for post ${postId}:`, {
                userVote: userVote,
                dataAttr: voteSection.attr('data-user-vote'),
                score: score
            });
            
            if (userVote && userVote !== '') {
                console.log(`Initializing vote state for post ${postId}: ${userVote}`);
                updateButtonStates(postId, userVote, 'init', score);
            }
        });
    }

    // Hàm cập nhật trạng thái nút vote và màu sắc
    function updateButtonStates(postId, voteType, action, score) {
        const upBtn = $(`.vote-btn.upvote[data-id="${postId}"]`);
        const downBtn = $(`.vote-btn.downvote[data-id="${postId}"]`);
        const scoreEl = $(`#score-${postId}`);

        // Reset tất cả classes
        upBtn.removeClass('active voted-up voted-down');
        downBtn.removeClass('active voted-up voted-down');
        scoreEl.removeClass('positive negative voted');

        // Nếu không bỏ vote thì highlight với màu cam
        if (action !== 'removed') {
            if (voteType === 'up') {
                upBtn.addClass('active voted-up');
                scoreEl.addClass('voted');
            } else if (voteType === 'down') {
                downBtn.addClass('active voted-down');
                scoreEl.addClass('voted');
            }
        }

        // Màu score dựa trên giá trị
        if (score > 0) {
            scoreEl.addClass('positive');
        } else if (score < 0) {
            scoreEl.addClass('negative');
        }
        
        console.log(`Updated button states for post ${postId}: ${voteType} (${action}), score: ${score}`);
    }
});