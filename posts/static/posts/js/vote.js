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
                    
                    // Cập nhật data attribute cho tất cả vote sections của post này
                    const voteSections = $(`.vote-section[data-post-id="${postId}"], .vote-section-detail[data-post-id="${postId}"]`);
                    
                    if (data.action === 'removed') {
                        voteSections.attr('data-user-vote', '');
                        // Xóa class active khi bỏ vote
                        voteSections.filter('.vote-section-detail').removeClass('active');
                    } else {
                        voteSections.attr('data-user-vote', voteType);
                        // Thêm class active khi vote (chỉ cho detail view)
                        voteSections.filter('.vote-section-detail').addClass('active');
                    }
                    
                    // Lưu trạng thái vote vào sessionStorage để đồng bộ giữa các trang
                    updateVoteStateInStorage(postId, data.action === 'removed' ? null : voteType, data.score);
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

    // Hàm lưu trạng thái vote vào localStorage (persistent hơn sessionStorage)
    function updateVoteStateInStorage(postId, voteType, score) {
        try {
            let voteStates = JSON.parse(localStorage.getItem('voteStates') || '{}');
            voteStates[postId] = {
                vote: voteType,
                score: score,
                timestamp: Date.now()
            };
            localStorage.setItem('voteStates', JSON.stringify(voteStates));
            console.log('Vote state saved to storage:', { postId, voteType, score });
        } catch (e) {
            console.warn('Could not save vote state to storage:', e);
        }
    }

    // Hàm lấy trạng thái vote từ localStorage
    function getVoteStateFromStorage(postId) {
        try {
            const voteStates = JSON.parse(localStorage.getItem('voteStates') || '{}');
            const state = voteStates[postId];
            
            // Kiểm tra xem state có quá cũ không (hơn 24 giờ)
            if (state && (Date.now() - state.timestamp) > 86400000) {
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

    // Hàm khởi tạo trạng thái vote từ server data và storage
    function initializeVoteStates() {
        console.log('Initializing vote states...');
        
        // Handle both vote-section and vote-section-detail
        $('.vote-section, .vote-section-detail').each(function() {
            const voteSection = $(this);
            let userVote = voteSection.data('user-vote');
            const postId = voteSection.find('.vote-btn').first().data('id');
            let score = parseInt(voteSection.find('.score').text(), 10) || 0;
            const originalScore = score; // Lưu score gốc
            
            // Kiểm tra xem có state mới hơn trong storage không
            const storageState = getVoteStateFromStorage(postId);
            if (storageState) {
                userVote = storageState.vote;
                score = storageState.score;
                
                // Cập nhật UI với dữ liệu từ storage
                $(`#score-${postId}`).text(score);
                voteSection.attr('data-user-vote', userVote || '');
                
                console.log(`Using vote state from storage for post ${postId}:`, storageState);
            }
            
            console.log(`Vote section data for post ${postId}:`, {
                userVote: userVote,
                score: score,
                originalScore: originalScore,
                hasStorageState: !!storageState,
                sectionClass: voteSection.attr('class')
            });
            
            // Reset button states trước khi apply
            const upBtn = $(`.vote-btn.upvote[data-id="${postId}"]`);
            const downBtn = $(`.vote-btn.downvote[data-id="${postId}"]`);
            const scoreEl = $(`#score-${postId}`);
            
            upBtn.removeClass('active voted-up voted-down');
            downBtn.removeClass('active voted-up voted-down');
            scoreEl.removeClass('positive negative voted');
            voteSection.removeClass('active');
            
            if (userVote && userVote !== '') {
                console.log(`Initializing vote state for post ${postId}: ${userVote}`);
                updateButtonStates(postId, userVote, 'init', score);
                
                // Thêm class active nếu user đã vote (chỉ cho detail view)
                if (voteSection.hasClass('vote-section-detail')) {
                    voteSection.addClass('active');
                }
            } else {
                // Nếu không có vote, vẫn cần set màu score
                if (score > 0) {
                    scoreEl.addClass('positive');
                } else if (score < 0) {
                    scoreEl.addClass('negative');
                }
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

    // Cleanup old vote states khi trang load
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

    // Cleanup khi trang load
    cleanupOldVoteStates();
    
    // Handle browser back/forward button và page cache
    handleBrowserNavigation();
});

// Hàm xử lý navigation events
function handleBrowserNavigation() {
    // Xử lý khi trang được restore từ cache (back button)
    window.addEventListener('pageshow', function(event) {
        console.log('Page show event:', event.persisted);
        if (event.persisted) {
            // Trang được restore từ cache
            setTimeout(function() {
                initializeVoteStates();
            }, 100);
        }
    });
    
    // Xử lý popstate (back/forward button)
    window.addEventListener('popstate', function(event) {
        console.log('Pop state event');
        setTimeout(function() {
            initializeVoteStates();
        }, 100);
    });
    
    // Xử lý focus event (khi quay lại tab)
    window.addEventListener('focus', function() {
        console.log('Window focus event');
        setTimeout(function() {
            initializeVoteStates();
        }, 100);
    });
}