# posts/views.py
from django.contrib.auth import logout
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login
from .models import Follow, Post, Comment, Profile, Vote, Tag
from .forms import PostForm, CommentForm, ProfileForm, TagForm
from django.db.models import Count
from .forms import SettingsForm
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from .forms import SettingsForm
from django.db.models import Q
from django.contrib import messages
from .models import Community
from django.core.paginator import Paginator

def post_list(request):
    # Lấy tag filter nếu có
    tag_slug = request.GET.get('tag')
    search_query = request.GET.get('q')
    
    posts = Post.objects.annotate(num_comments=Count('comments')).order_by('-id')
    
    # Filter by tag
    if tag_slug:
        posts = posts.filter(tags__slug=tag_slug)
    
    # Filter by search query
    if search_query:
        posts = posts.filter(
            Q(title__icontains=search_query) |
            Q(content__icontains=search_query) |
            Q(tags__name__icontains=search_query)
        ).distinct()
    
    # Pagination
    paginator = Paginator(posts, 10)  # 10 posts per page
    page = request.GET.get('page')
    posts = paginator.get_page(page)
    
    upvoted_posts = set()
    downvoted_posts = set()
    if request.user.is_authenticated:
        # FIX: Lấy vote dựa trên post objects trong paginated queryset
        post_ids = [post.id for post in posts]
        user_votes = Vote.objects.filter(
            user=request.user,
            post_id__in=post_ids
        ).select_related('post')
        
        for vote in user_votes:
            # FIX: So sánh với boolean thay vì string
            if vote.is_upvote == True:  # hoặc if vote.is_upvote:
                upvoted_posts.add(vote.post.id)
            elif vote.is_upvote == False:  # hoặc if not vote.is_upvote:
                downvoted_posts.add(vote.post.id)
    
    # Debug: In ra console để kiểm tra
    print(f"Upvoted posts: {upvoted_posts}")
    print(f"Downvoted posts: {downvoted_posts}")

    # Get popular tags for sidebar
    popular_tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')[:10]
    
    context = {
        'posts': posts,
        'popular_tags': popular_tags,
        'current_tag': tag_slug,
        'search_query': search_query,
        'upvoted_posts': upvoted_posts,
        'downvoted_posts': downvoted_posts,
    }
    
    return render(request, 'posts/post_list.html', context)

@login_required
def vote_post(request):
    """Xử lý vote cho post"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        post_id = request.POST.get('post_id')
        vote_type = request.POST.get('vote_type')
        
        if not post_id or not vote_type:
            return JsonResponse({'error': 'Missing parameters'}, status=400)
            
        post = get_object_or_404(Post, id=post_id)
        
        # Kiểm tra vote_type hợp lệ
        if vote_type not in ['up', 'down']:
            return JsonResponse({'error': 'Invalid vote type'}, status=400)
        
        # Chuyển đổi vote_type thành boolean
        is_upvote = vote_type == 'up'
        
        # Tìm vote hiện tại của user cho post này
        try:
            existing_vote = Vote.objects.get(user=request.user, post=post)
            
            # Nếu vote giống nhau, xóa vote (toggle)
            if existing_vote.is_upvote == is_upvote:
                existing_vote.delete()
                action = 'removed'
            else:
                # Nếu khác, cập nhật vote
                existing_vote.is_upvote = is_upvote
                existing_vote.save()
                action = 'updated'
                
        except Vote.DoesNotExist:
            # Tạo vote mới
            Vote.objects.create(
                user=request.user,
                post=post,
                is_upvote=is_upvote
            )
            action = 'created'
        
        # Tính lại score từ database sau khi thay đổi vote
        post.refresh_from_db()
        new_score = post.score
        
        return JsonResponse({
            'success': True,
            'score': new_score,
            'action': action,
            'vote_type': vote_type  # Thêm thông tin vote_type để frontend xử lý
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

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
            comment = form.save(commit=False)
            comment.post   = post
            comment.author = request.user
            comment.save()
            return redirect('posts:post_detail', pk=pk)
    else:
        form = CommentForm()

    # Get related posts by tags
    related_posts = []
    if post.tags.exists():
        related_posts = Post.objects.filter(
            tags__in=post.tags.all()
        ).exclude(pk=post.pk).distinct()[:5]
    
    # Get vote status for this post if user is authenticated
    user_vote = None
    if request.user.is_authenticated:
        try:
            user_vote = Vote.objects.get(user=request.user, post=post)
        except Vote.DoesNotExist:
            pass

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
def my_posts_view(request):
    posts = Post.objects.filter(author=request.user).order_by('-created_at')
    return render(request, 'posts/my_posts.html', {'posts': posts})

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
def user_search(request):
    q = request.GET.get('q', '').strip()
    results = []
    if q:
        results = User.objects.filter(username__icontains=q)
    return render(request, 'posts/user_search.html', {
        'results': results,
        'query': q,
    })

# Profile with follow status
@login_required
def user_profile_view(request, username):
    user_obj = get_object_or_404(User, username=username)
    profile  = getattr(user_obj, 'profile', None)
    is_following = Follow.objects.filter(
        follower=request.user,
        following=user_obj
    ).exists()
    # Lấy luôn các post của user này
    user_posts = Post.objects.filter(author=user_obj).order_by('-created_at')

    return render(request, 'posts/user_profile.html', {
        'user_obj': user_obj,
        'profile': profile,
        'is_following': is_following,
        'user_posts': user_posts,    # truyền vào template
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