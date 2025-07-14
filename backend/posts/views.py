import re
from django.contrib.auth import logout
from django.db import connection
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login
from django.urls import reverse
from .models import Follow, Post, Comment, Profile, Vote, Tag, Community, Notification
from .forms import PostForm, CommentForm, ProfileForm, TagForm, CommunityForm, SettingsForm
from django.db.models import Count, Sum, Case, When, IntegerField, Q, F, FloatField, Value
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from django.contrib import messages
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import Coalesce
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from rest_framework import viewsets
from .models import Post
from .serializers import PostSerializer



def post_list(request):
    # Get filters
    tag_slugs = request.GET.getlist('tag')
    search_query = request.GET.get('q')
    sort_by = request.GET.get('sort', 'new')
    time_filter = request.GET.get('time', 'all')
    
    # Base queryset with annotations
    posts = Post.objects.annotate(
        num_comments=Count('comments'),
        calculated_score=Coalesce(Sum(Case(
            When(votes__is_upvote=True, then=1),
            When(votes__is_upvote=False, then=-1),
            default=0,
            output_field=IntegerField()
        )), 0)
    )
    
    # Apply filters
    if tag_slugs:
        for tag_slug in tag_slugs:
            posts = posts.filter(tags__slug=tag_slug)
        posts = posts.distinct()
    
    if search_query:
        posts = posts.filter(
            Q(title__icontains=search_query) |
            Q(content__icontains=search_query) |
            Q(tags__name__icontains=search_query)
        ).distinct()
    
    # Apply time filter for 'top' sorting
    if sort_by == 'top' and time_filter != 'all':
        now = timezone.now()
        time_threshold = None
        if time_filter == 'day':
            time_threshold = now - timedelta(days=1)
        # ... (các time filter khác)
        if time_threshold:
            posts = posts.filter(created_at__gte=time_threshold)
    
    # Apply sorting (giữ nguyên logic sorting của bạn)
    if sort_by == 'hot':
         # ...
         pass # Giữ nguyên logic sorting của bạn
    elif sort_by == 'top':
        posts = posts.order_by('-calculated_score', '-created_at')
    else: # Default to 'new'
        posts = posts.order_by('-created_at')

    # Pagination
    paginator = Paginator(posts, 10)
    page = request.GET.get('page')
    posts_page = paginator.get_page(page)
    
    # === SỬA ĐỔI CHÍNH ===
    # Lấy dữ liệu vote của user một cách hiệu quả và xóa bỏ đoạn code thừa.
    # Hàm helper sẽ trả về 2 sets: một cho upvotes và một cho downvotes.
    upvoted_posts, downvoted_posts = get_user_vote_data_for_posts(request.user, posts_page)
    
    # [ĐÃ XÓA] Đoạn code thừa lặp qua Vote.objects.filter(...) đã bị loại bỏ.
    
    # Get popular tags for sidebar
    popular_tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')[:10]
    
    sort_options = [('hot', 'Hot'), ('new', 'New'), ('top', 'Top')]
    time_options = [('day', 'Past 24 Hours'), ('week', 'Past Week'), ('all', 'All Time')]
    
    selected_tags = Tag.objects.filter(slug__in=tag_slugs) if tag_slugs else []
    
    context = {
        'posts': posts_page,
        'popular_tags': popular_tags,
        'selected_tags': selected_tags,
        'search_query': search_query,
        'upvoted_posts': upvoted_posts,      # Dữ liệu đúng từ helper
        'downvoted_posts': downvoted_posts,  # Dữ liệu đúng từ helper
        'sort_by': sort_by,
        'time_filter': time_filter,
        'sort_options': sort_options,
        'time_options': time_options,
    }
    
    return render(request, 'posts/post_list.html', context)

# Add a new view for toggling tags via AJAX
@login_required
def toggle_tag_filter(request):
    """Toggle a tag in the current filter set"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    tag_slug = request.POST.get('tag_slug')
    current_tags = request.POST.getlist('current_tags')
    
    if not tag_slug:
        return JsonResponse({'error': 'Tag slug required'}, status=400)
    
    # Toggle tag in current selection
    if tag_slug in current_tags:
        current_tags.remove(tag_slug)
        action = 'removed'
    else:
        current_tags.append(tag_slug)
        action = 'added'
    
    return JsonResponse({
        'success': True,
        'action': action,
        'current_tags': current_tags,
        'tag_slug': tag_slug
    })

# Hàm chính để tạo post
@login_required(login_url='/login/')
def create_post(request):
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            form.instance = post
            form.save()
            # Form đã tự động xử lý tags trong method save()
            return redirect('posts:post_detail', pk=post.pk)
    else:
        form = PostForm()
    
    return render(request, 'posts/create_post.html', {
        'form': form,
        'is_edit': False
    })

@login_required
def logout_view(request):
    logout(request)
    return redirect('posts:post_list')

def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    
    if request.method == 'POST':
        form = CommentForm(request.POST)
        if form.is_valid() and request.user.is_authenticated:
            # Ngăn user bình luận bài của chính mình (để test notification)
            # if post.author != request.user: # Bỏ comment dòng này nếu bạn muốn tự comment bài mình
                comment = form.save(commit=False)
                comment.post   = post
                comment.author = request.user
                comment.save() # Signal `create_comment_notification` sẽ được kích hoạt ở đây
                return redirect('posts:post_detail', pk=pk)
    else:
        form = CommentForm()

    related_posts = []
    if post.tags.exists():
        related_posts = Post.objects.filter(
            tags__in=post.tags.all()
        ).exclude(pk=post.pk).distinct()[:5]
    
    user_vote = None
    if request.user.is_authenticated:
        user_vote = post.get_user_vote(request.user)

    return render(request, 'posts/post_detail.html', {
        'post': post,
        'form': form,
        'related_posts': related_posts,
        'user_vote': user_vote,
    })


def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            auth_login(request, user)
            return redirect('posts:post_list')
    else:
        form = UserCreationForm()
    return render(request, 'posts/register.html', {'form': form})

@login_required
def profile_view(request, pk):
    user_obj = get_object_or_404(User, pk=pk)
    profile  = getattr(user_obj, 'profile', None)
    return render(request, 'posts/profile.html', {
        'user_obj': user_obj,
        'profile': profile
    })

@login_required
def settings_view(request):
    """
    Cho phép user chỉnh first_name, last_name, email và avatar cùng lúc.
    """
    # Lấy hoặc tạo Profile liên kết với user
    profile, created = Profile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        user_form = SettingsForm(request.POST, instance=request.user)
        profile_form = ProfileForm(request.POST, request.FILES, instance=profile)
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            
            messages.success(request, "Your settings have been updated.")
            return redirect('posts:user_settings')
        else:
            messages.error(request, "Please fix the errors below.")
    else:
        user_form = SettingsForm(instance=request.user)
        profile_form = ProfileForm(instance=profile)
    
    return render(request, 'posts/settings.html', {
        'user_form': user_form,
        'profile_form': profile_form,
    })

@login_required
def profile_edit(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect('posts:profile', pk=request.user.id)
    else:
        form = ProfileForm(instance=profile)
    return render(request, 'posts/profile_edit.html', {'form': form})



@login_required
def password_change_view(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            form.save()
            # logout ngay sau khi đổi mật khẩu
            logout(request)
            # redirect về trang login
            return redirect('login')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'posts/password_change.html', {'form': form})

# Search users by username
"""
def user_search(request):
    q = request.GET.get('q', '').strip()
    results = []
    if q:
        results = User.objects.filter(username__icontains=q)
    return render(request, 'posts/user_search.html', {
        'results': results,
        'query': q,
    })
"""

def unified_search_view(request):
    """
    Trang tìm kiếm hợp nhất, hiển thị kết quả cho cả posts và users.
    """
    query = request.GET.get('q', '').strip()
    posts_results = []
    users_results = []

    if query:
        # Sử dụng các hàm helper đã có để tìm kiếm
        posts_results = search_posts_enhanced(query)
        users_results = search_users_enhanced(query)

    context = {
        'query': query,
        'posts': posts_results,
        'users': users_results,
    }
    return render(request, 'posts/search_results.html', context)


# Profile with follow status
@login_required
def user_profile_view(request, username):
    user_obj = get_object_or_404(User, username=username)
    profile  = getattr(user_obj, 'profile', None)

    is_following = Follow.objects.filter(
        follower=request.user,
        following=user_obj
    ).exists()
    
    # Lấy luôn các post của user này với vote annotations
    user_posts = Post.objects.filter(author=user_obj).annotate(
        num_comments=Count('comments'),
        upvotes=Count('votes', filter=Q(votes__is_upvote=True)),
        downvotes=Count('votes', filter=Q(votes__is_upvote=False)),
        calculated_score=Sum(Case(
            When(votes__is_upvote=True, then=1),
            When(votes__is_upvote=False, then=-1),
            default=0,
            output_field=IntegerField()
        ))
    ).order_by('-created_at')

    # Get user votes for these posts
    upvoted_posts, downvoted_posts = get_user_vote_data_for_posts(request.user, user_posts)

    

    return render(request, 'posts/user_profile.html', {
        'user_obj': user_obj,
        'profile': profile,
        'is_following': is_following,
        'user_posts': user_posts,
        'upvoted_posts': upvoted_posts,      # Populated by the helper
        'downvoted_posts': downvoted_posts,  # Populated by the helper
    })

# Toggle follow/unfollow
@login_required
def follow_toggle(request, username):
    target = get_object_or_404(User, username=username)
    if target == request.user:
        messages.error(request, "You cannot follow yourself.")
        return redirect('posts:user_profile', username=username)

    obj, created = Follow.objects.get_or_create(
        follower=request.user,
        following=target
    )
    if not created:
        obj.delete()
        messages.success(request, f"You unfollowed {username}.")
    else:
        messages.success(request, f"You are now following {username}.")
    return redirect('posts:user_profile', username=username)

def community_view(request, slug):
    community = get_object_or_404(Community, slug=slug)
    posts = (
        Post.objects
            .filter(community=community)
            .annotate(comment_count=Count('comments'))
            .order_by('-created_at')
    )
    return render(request, 'posts/community.html', {
        'community': community,
        'posts': posts,
    })

# Tag views
def tag_detail(request, slug):
    """View để xem tất cả posts có tag cụ thể"""
    tag = get_object_or_404(Tag, slug=slug)
    posts = Post.objects.filter(tags=tag).annotate(
        num_comments=Count('comments')
    ).order_by('-created_at')
    
    # Pagination
    paginator = Paginator(posts, 10)
    page = request.GET.get('page')
    posts = paginator.get_page(page)
    
    return render(request, 'posts/tag_detail.html', {
        'tag': tag,
        'posts': posts,
    })

def all_tags(request):
    """View để xem tất cả tags"""
    tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')
    
    # Pagination
    paginator = Paginator(tags, 50)
    page = request.GET.get('page')
    tags = paginator.get_page(page)
    
    return render(request, 'posts/all_tags.html', {'tags': tags})

@login_required
def edit_post(request, pk):
    post = get_object_or_404(Post, pk=pk)
    
    # Kiểm tra quyền edit
    if post.author != request.user:
        return redirect('posts:post_detail', pk=pk)
    
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, instance=post)
        if form.is_valid():
            form.save()  # Form tự động xử lý tags
            return redirect('posts:post_detail', pk=post.pk)
    else:
        form = PostForm(instance=post)
    
    return render(request, 'posts/post_form.html', {
        'form': form,
        'is_edit': True,
        'post': post
    })

@login_required
def delete_post(request, pk):
    """Delete post"""
    post = get_object_or_404(Post, pk=pk, author=request.user)
    
    if request.method == 'POST':
        post.delete()
        messages.success(request, 'Post deleted successfully!')
        return redirect('posts:post_list')
    
    return render(request, 'posts/confirm_delete.html', {'post': post})

@login_required
def community_create(request):
    if request.method == 'POST':
        form = CommunityForm(request.POST)
        if form.is_valid():
            comm = form.save(commit=False)
            comm.owner = request.user
            comm.save()
            return redirect('posts:community_detail', slug=comm.slug)
    else:
        form = CommunityForm()
    return render(request, 'posts/community_form.html', {'form': form})

@login_required
def community_update(request, slug):
    comm = get_object_or_404(Community, slug=slug, owner=request.user)
    if request.method == 'POST':
        form = CommunityForm(request.POST, instance=comm)
        if form.is_valid():
            form.save()
            return redirect('posts:community_detail', slug=comm.slug)
    else:
        form = CommunityForm(instance=comm)
    return render(request, 'posts/community_form.html', {'form': form, 'community': comm})

@login_required
def community_delete(request, slug):
    comm = get_object_or_404(Community, slug=slug, owner=request.user)
    if request.method == 'POST':
        comm.delete()
        return redirect('posts:community_list')
    return render(request, 'posts/community_confirm_delete.html', {'community': comm})

def community_list(request):
    communities = Community.objects.all().order_by('-created_at')
    return render(request, 'posts/community_list.html', {'communities': communities})

def community_detail(request, slug):
    comm = get_object_or_404(Community, slug=slug)
    posts = comm.post_set.all()  # giả sử trong Post có FK 'community'
    return render(request, 'posts/community_detail.html', {'community': comm, 'posts': posts})


# Notification system
# Add these imports at the top of your views.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

# Enhanced notification signals
@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Tạo thông báo khi có người bình luận vào bài viết"""
    if created and instance.author != instance.post.author:
        Notification.objects.create(
            recipient=instance.post.author,
            sender=instance.author,
            notification_type='comment',
            post=instance.post,
            comment=instance,
            message=f"{instance.author.username} commented on your post: {instance.post.title[:50]}..."
        )


@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    """Tạo thông báo khi có người theo dõi bạn"""
    if created:
        Notification.objects.create(
            recipient=instance.following,
            sender=instance.follower,
            notification_type='follow',
            message=f"{instance.follower.username} started following you"
        )

@receiver(post_save, sender=Vote)
def create_vote_notification(sender, instance, created, **kwargs):
    """Tạo thông báo khi có người vote cho bài viết của bạn"""
    # Chỉ tạo thông báo cho upvote và khi người vote không phải là tác giả
    if instance.is_upvote and instance.user != instance.post.author:
        # Kiểm tra xem đã có thông báo vote gần đây từ user này cho post này chưa để tránh spam
        five_minutes_ago = timezone.now() - timedelta(minutes=5)
        existing_notification = Notification.objects.filter(
            recipient=instance.post.author,
            sender=instance.user,
            notification_type='vote',
            post=instance.post,
            created_at__gte=five_minutes_ago
        ).exists()
        
        if not existing_notification:
            Notification.objects.create(
                recipient=instance.post.author,
                sender=instance.user,
                notification_type='vote',
                post=instance.post,
                message=f"{instance.user.username} upvoted your post: {instance.post.title[:50]}..."
            )

@receiver(post_delete, sender=Vote)
def handle_vote_deletion(sender, instance, **kwargs):
    """Xóa notification tương ứng khi một upvote bị xóa"""
    if instance.is_upvote:
        Notification.objects.filter(
            recipient=instance.post.author,
            sender=instance.user,
            notification_type='vote',
            post=instance.post
        ).delete()

# Enhanced vote_post view with better error handling
@login_required
def vote_post(request):
    """Xử lý vote cho post và kích hoạt signals"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        post_id = request.POST.get('post_id')
        vote_type = request.POST.get('vote_type')
        
        if not post_id or not vote_type:
            return JsonResponse({'error': 'Missing parameters'}, status=400)
            
        post = get_object_or_404(Post, id=post_id)
        
        if vote_type not in ['up', 'down']:
            return JsonResponse({'error': 'Invalid vote type'}, status=400)
        
        
        
        is_upvote = vote_type == 'up'
        
        existing_vote = Vote.objects.filter(user=request.user, post=post).first()
        action = ''
        
        if existing_vote:
            if existing_vote.is_upvote == is_upvote:
                existing_vote.delete()
                action = 'removed'
            else:
                existing_vote.is_upvote = is_upvote
                existing_vote.save()
                action = 'updated'
        else:
            Vote.objects.create(user=request.user, post=post, is_upvote=is_upvote)
            action = 'created'
            
        # Tính toán lại điểm số
        upvotes = post.votes.filter(is_upvote=True).count()
        downvotes = post.votes.filter(is_upvote=False).count()
        new_score = upvotes - downvotes
        
        return JsonResponse({
            'success': True,
            'score': new_score,
            'action': action,
            'vote_type': vote_type
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# Enhanced notification views
@login_required
def notifications_view(request):
    """Trang xem tất cả notifications"""
    notifications = Notification.objects.filter(recipient=request.user).order_by('-created_at')
    
    # Đánh dấu tất cả là đã đọc khi vào trang này
    notifications.update(is_read=True)
    
    paginator = Paginator(notifications, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'posts/notifications.html', {'notifications': page_obj})



@login_required
def mark_notification_read(request, notification_id):
    """Đánh dấu một notification là đã đọc và redirect"""
    notification = get_object_or_404(Notification, id=notification_id, recipient=request.user)
    notification.mark_as_read()
    return redirect(notification.get_action_url())

@login_required
def mark_all_notifications_read(request):
    """API để đánh dấu tất cả notifications là đã đọc"""
    if request.method == 'POST':
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return JsonResponse({'success': True, 'updated_count': count})
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@login_required
def get_unread_notifications_count(request):
    """API endpoint để lấy số lượng và danh sách notification chưa đọc"""
    notifications = Notification.objects.filter(
        recipient=request.user
    ).select_related('sender', 'post').order_by('-created_at')
    
    count = notifications.filter(is_read=False).count()
    recent_notifications = notifications[:5]
    
    notifications_data = []
    for notif in recent_notifications:
        data = {
            'id': notif.id,
            'sender': notif.sender.username,
            'message': notif.message,
            'type': notif.notification_type,
            'is_read': notif.is_read,
            'created_at': notif.created_at.isoformat(), # Dùng ISO format cho JS
            'action_url': notif.get_action_url() # Thêm action URL
        }
        notifications_data.append(data)
    
    return JsonResponse({
        'count': count,
        'notifications': notifications_data
    })


@login_required
def delete_notification(request, notification_id):
    """Delete a specific notification"""
    if request.method == 'POST':
        notification = get_object_or_404(
            Notification, 
            id=notification_id, 
            recipient=request.user
        )
        notification.delete()
        messages.success(request, "Notification deleted.")
    
    return redirect('posts/notifications.html')

@login_required
def clear_all_notifications(request):
    """Clear all notifications for the user"""
    if request.method == 'POST':
        deleted_count = Notification.objects.filter(recipient=request.user).count()
        Notification.objects.filter(recipient=request.user).delete()
        messages.success(request, f"Cleared {deleted_count} notifications.")
    
    return redirect('posts/notifications.html')


# Chức năng lấy dữ liệu vote của user cho một danh sách post
def get_user_vote_data_for_posts(user, posts):
    """
    Given a user and a list of posts, returns two sets:
    one for upvoted post IDs and one for downvoted post IDs.
    """
    upvoted_posts = set()
    downvoted_posts = set()
    
    # Return empty sets if the user isn't logged in
    if not user.is_authenticated:
        return upvoted_posts, downvoted_posts

    # Get a list of post IDs from the provided post objects
    post_ids = [post.id for post in posts]
    if not post_ids:
        return upvoted_posts, downvoted_posts

    # Fetch all relevant votes in a single, efficient database query
    user_votes = Vote.objects.filter(
        user=user,
        post_id__in=post_ids
    ).values('post_id', 'is_upvote')

    # Populate the sets based on the query results
    for vote in user_votes:
        if vote['is_upvote']:
            upvoted_posts.add(vote['post_id'])
        else:
            downvoted_posts.add(vote['post_id'])
            
    return upvoted_posts, downvoted_posts


def unified_search_api(request):
    query = request.GET.get('q', '').strip()
    search_type = request.GET.get('type', 'all')
    
    if len(query) < 2:
        return JsonResponse({'posts': [], 'users': []})
    
    results = {'posts': [], 'users': []}
    
    if search_type in ['posts', 'all']:
        # Enhanced post search with ranking
        posts = search_posts_enhanced(query)
        results['posts'] = format_post_results(posts)
    
    if search_type in ['users', 'all']:
        # Enhanced user search
        users = search_users_enhanced(query)
        results['users'] = format_user_results(users)
    
    return JsonResponse(results)

def search_posts_enhanced(query):
    """Enhanced post search with ranking and relevance"""
    
    # If PostgreSQL with full-text search is available
    if connection.vendor == 'postgresql':
        try:
            # Full-text search with ranking
            search_vector = SearchVector('title', weight='A') + SearchVector('content', weight='B')
            search_query = SearchQuery(query)
            
            posts = Post.objects.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            ).filter(
                search=search_query
            ).select_related('author', 'community').order_by('-rank')[:10]
            
            if posts.exists():
                return posts[:5]
        except:
            pass
    
    # Fallback to enhanced icontains search with ranking
    posts = Post.objects.filter(
        Q(title__icontains=query) | Q(content__icontains=query)
    ).annotate(
        # Ranking: exact title match > title contains > content contains
        relevance_score=Case(
            When(title__iexact=query, then=100),
            When(title__icontains=query, then=50),
            When(content__icontains=query, then=10),
            default=0,
            output_field=IntegerField()
        )
    ).select_related('author', 'community').order_by('-relevance_score', '-created_at')[:5]
    
    return posts

def search_users_enhanced(query):
    """Enhanced user search"""
    users = User.objects.filter(
        username__icontains=query
    ).annotate(
        # Exact match gets higher priority
        relevance_score=Case(
            When(username__iexact=query, then=100),
            When(username__istartswith=query, then=50),
            When(username__icontains=query, then=10),
            default=0,
            output_field=IntegerField()
        )
    ).select_related('profile').order_by('-relevance_score', '-date_joined')[:5]
    
    return users

def format_post_results(posts):
    """Format post results with highlighted text"""
    results = []
    
    for post in posts:
        # Get snippet from content (first 100 chars)
        content_snippet = post.content[:100] + '...' if len(post.content) > 100 else post.content
        
        results.append({
            'id': post.id,
            'title': post.title,
            'content_snippet': content_snippet,
            'author': post.author.username,
            'community': post.community.name if post.community else None,
            'created_at': post.created_at.strftime('%Y-%m-%d %H:%M'),
            # FIX: Use Django's reverse to generate the correct URL
            'url': reverse('posts:post_detail', kwargs={'pk': post.id}),
            'vote_score': getattr(post, 'vote_score', 0),
            'comment_count': post.comments.count() if hasattr(post, 'comments') else 0
        })
    
    return results

def format_user_results(users):
    """Format user results"""
    results = []
    
    for user in users:
        results.append({
            'id': user.id,
            'username': user.username,
            'karma': getattr(user.profile, 'karma', 0) if hasattr(user, 'profile') else 0,
            'joined': user.date_joined.strftime('%Y-%m-%d'),
            'url': f'/users/{user.username}/',
            'avatar': user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None,
            'post_count': user.posts.count() if hasattr(user, 'posts') else 0
        })
    
    return results

def highlight_text(text, query):
    """Highlight search terms in text"""
    if not query or not text:
        return text
    
    # Escape special regex characters
    escaped_query = re.escape(query)
    
    # Case-insensitive replacement
    highlighted = re.sub(
        f'({escaped_query})',
        r'<mark>\1</mark>',
        text,
        flags=re.IGNORECASE
    )
    
    return highlighted

# Alternative search view for full page search results
def search_posts_view(request):
    """Full page search results for posts"""
    query = request.GET.get('q', '').strip()
    page = int(request.GET.get('page', 1))
    per_page = 20
    
    if not query:
        return render(request, 'posts/search_results.html', {
            'posts': [],
            'query': query,
            'total_results': 0
        })
    
    # Get paginated results
    posts = search_posts_enhanced(query)
    
    # For pagination (if using Django's Paginator)
    from django.core.paginator import Paginator
    paginator = Paginator(posts, per_page)
    page_obj = paginator.get_page(page)
    
    return render(request, 'posts/search_results.html', {
        'posts': page_obj,
        'query': query,
        'total_results': paginator.count,
        'page_obj': page_obj
    })


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by("-created_at")
    serializer_class = PostSerializer