function showAlert(message, type = 'info', callback = null, duration = 2000) {
    const $container = $('#custom-alert-container');
    const $alert     = $('#custom-alert');
    const $msg       = $('#custom-alert-message');
    
    $msg.html(message);  
    $alert
      .removeClass('info success warning error')
      .addClass(type);
    
    $container.removeClass('hidden');
    
    $('#custom-alert-close').off('click').on('click', () => {
      $container.addClass('hidden');
      if (callback) callback();
    });
    
    setTimeout(() => {
      $container.addClass('hidden');
      if (callback) callback();
    }, duration);
}

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

// Hàm lưu trạng thái vote vào localStorage
function updateVoteStateInStorage(postId, voteType, score) {
    try {
        let voteStates = JSON.parse(localStorage.getItem('voteStates') || '{}');
        voteStates[postId] = {
            vote: voteType,
            score: score,
            timestamp: Date.now()
        };
        localStorage.setItem('voteStates', JSON.stringify(voteStates));
    } catch (e) {
        console.warn('Could not save vote state to storage:', e);
    }
}

// Hàm lấy trạng thái vote từ localStorage
function getVoteStateFromStorage(postId) {
    try {
        const voteStates = JSON.parse(localStorage.getItem('voteStates') || '{}');
        const state = voteStates[postId];
        
        if (state && (Date.now() - state.timestamp) > 86400000) { // Hết hạn sau 24 giờ
            delete voteStates[postId];
            localStorage.setItem('voteStates', JSON.stringify(voteStates));
            return null;
        }
        
        return state;
    } catch (e) {
        console.warn('Could not read vote state from storage:', e);
        return null;
    }
}

// Hàm cập nhật trạng thái nút vote và màu sắc
function updateButtonStates(postId, voteType, action, score) {
    const upBtn = $(`.vote-btn.upvote[data-id="${postId}"]`);
    const downBtn = $(`.vote-btn.downvote[data-id="${postId}"]`);
    const scoreEl = $(`#score-${postId}`);

    upBtn.removeClass('active voted-up voted-down');
    downBtn.removeClass('active voted-up voted-down');
    scoreEl.removeClass('positive negative voted');

    if (action !== 'removed') {
        if (voteType === 'up') {
            upBtn.addClass('active voted-up');
            scoreEl.addClass('voted');
        } else if (voteType === 'down') {
            downBtn.addClass('active voted-down');
            scoreEl.addClass('voted');
        }
    }

    if (score > 0) {
        scoreEl.addClass('positive');
    } else if (score < 0) {
        scoreEl.addClass('negative');
    }
}

// Hàm khởi tạo trạng thái vote từ server data và storage
function initializeVoteStates() {
    console.log('Initializing or re-initializing vote states...');
    $('.vote-section, .vote-section-detail').each(function() {
        const voteSection = $(this);
        const postId = voteSection.data('post-id');
        
        let storageState = null;
        
        // *** THAY ĐỔI CHÍNH: Chỉ kiểm tra localStorage nếu người dùng đã đăng nhập ***
        if (window.voteConfig && window.voteConfig.isAuthenticated) {
            storageState = getVoteStateFromStorage(postId);
        }

        // Nếu có trạng thái trong storage (và người dùng đã đăng nhập), sử dụng nó
        if (storageState) {
            $(`#score-${postId}`).text(storageState.score);
            voteSection.attr('data-user-vote', storageState.vote || '');
            updateButtonStates(postId, storageState.vote, storageState.vote ? 'updated' : 'removed', storageState.score);
        } else {
            // Ngược lại (người dùng chưa đăng nhập hoặc không có state), dùng dữ liệu từ server
            const userVote = voteSection.data('user-vote');
            const score = parseInt(voteSection.find('.score').text(), 10) || 0;
            updateButtonStates(postId, userVote, 'init', score);
        }
    });
}


// Hàm dọn dẹp các trạng thái vote cũ trong localStorage
function cleanupOldVoteStates() {
    try {
        const voteStates = JSON.parse(localStorage.getItem('voteStates') || '{}');
        const now = Date.now();
        let hasChanges = false;
        
        for (const postId in voteStates) {
            if (now - voteStates[postId].timestamp > 86400000) { // 24 hours
                delete voteStates[postId];
                hasChanges = true;
            }
        }
        
        if (hasChanges) {
            localStorage.setItem('voteStates', JSON.stringify(voteStates));
        }
    } catch (e) {
        console.warn('Could not cleanup old vote states:', e);
    }
}

// *** SỬA ĐỔI CHÍNH ***
// Lắng nghe sự kiện pageshow. Sự kiện này sẽ kích hoạt khi trang được tải
// hoặc được khôi phục từ back-forward cache.
window.addEventListener('pageshow', function(event) {
    // event.persisted là true nếu trang được khôi phục từ cache
    if (event.persisted) {
        console.log('Page restored from bfcache. Re-initializing votes.');
        initializeVoteStates();
    }
});


$(document).ready(function() {
    console.log('Vote system initialized on document ready.');

    if (!window.voteConfig) {
        console.error('voteConfig not found');
        return;
    }

    // Khởi tạo trạng thái lần đầu
    initializeVoteStates();

    // Dọn dẹp storage
    cleanupOldVoteStates();

    // Gắn sự kiện click cho nút vote
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
                    $(`#score-${postId}`).text(data.score);
                    
                    // Cập nhật trạng thái nút và lưu vào localStorage
                    updateButtonStates(postId, voteType, data.action, data.score);
                    updateVoteStateInStorage(postId, data.action === 'removed' ? null : voteType, data.score);
                    
                    // Cập nhật data attribute để nhất quán
                    const voteSections = $(`.vote-section[data-post-id="${postId}"], .vote-section-detail[data-post-id="${postId}"]`);
                     if (data.action === 'removed') {
                        voteSections.attr('data-user-vote', '');
                    } else {
                        voteSections.attr('data-user-vote', voteType);
                    }
                }
            },
            error: function(xhr) {
                console.error('Vote error:', xhr.responseText);
                showAlert('Có lỗi xảy ra khi vote. Vui lòng thử lại!', 'error', null, 3000);
            },
            complete: function() {
                btn.prop('disabled', false);
            }
        });
    });
});