from django.contrib.auth import logout
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login as auth_login
from .models import Follow, Post, Comment, Profile, Vote, Tag
from .forms import PostForm, CommentForm, ProfileForm, TagForm, CommunityForm
from django.db.models import Count, Sum, Case, When, IntegerField
from .forms import SettingsForm
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from .forms import SettingsForm
from django.db.models import Q
from django.contrib import messages
from .models import Community
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta
from django.db.models import (
    Count,
    Q,
    Sum,
    Case,
    When,
    IntegerField,
    FloatField,
    F,
    Value,
)
from django.db.models.functions import (
    Extract,
    Coalesce,
    Power,
    Cast,
)

def post_list(request):
    # Get filters - MODIFIED: Support multiple tags
    tag_slugs = request.GET.getlist('tag')  # Changed from get() to getlist()
    search_query = request.GET.get('q')
    sort_by = request.GET.get('sort', 'new')
    time_filter = request.GET.get('time', 'all')
    
    # Base queryset with annotations
    posts = Post.objects.annotate(
        num_comments=Count('comments'),
        upvotes=Count('votes', filter=Q(votes__is_upvote=True)),
        downvotes=Count('votes', filter=Q(votes__is_upvote=False)),
        calculated_score=Sum(Case(
            When(votes__is_upvote=True, then=1),
            When(votes__is_upvote=False, then=-1),
            default=0,
            output_field=IntegerField()
        ))
    )
    
    # Apply filters - MODIFIED: Support multiple tags
    if tag_slugs:
        # Filter posts that have ALL selected tags
        for tag_slug in tag_slugs:
            posts = posts.filter(tags__slug=tag_slug)
        # Remove duplicates
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
        
        if time_filter == 'hour':
            time_threshold = now - timedelta(hours=1)
        elif time_filter == 'day':
            time_threshold = now - timedelta(days=1)
        elif time_filter == 'week':
            time_threshold = now - timedelta(weeks=1)
        elif time_filter == 'month':
            time_threshold = now - timedelta(days=30)
        elif time_filter == 'year':
            time_threshold = now - timedelta(days=365)
            
        if time_threshold:
            posts = posts.filter(created_at__gte=time_threshold)
    
    # Apply sorting
    if sort_by == 'hot':
        now = timezone.now()
        
        one_hour_ago = now - timedelta(hours=1)
        six_hours_ago = now - timedelta(hours=6)
        one_day_ago = now - timedelta(days=1)
        one_week_ago = now - timedelta(weeks=1)
        
        posts = posts.annotate(
            safe_score=Coalesce('calculated_score', 0),
            hot_score=Case(
                When(created_at__gte=one_hour_ago, then=F('safe_score') + 3),
                When(created_at__gte=six_hours_ago, then=F('safe_score') * 0.9),
                When(created_at__gte=one_day_ago, then=F('safe_score') * 0.7),
                When(created_at__gte=one_week_ago, then=F('safe_score') * 0.4),
                default=F('safe_score') * 0.1,
                output_field=FloatField()
            )
        ).order_by('-hot_score', '-created_at')

    elif sort_by == 'top':
        posts = posts.order_by('-calculated_score', '-created_at')
        
    elif sort_by == 'new':
        posts = posts.order_by('-created_at')
        
    elif sort_by == 'rising':
        recent_time = timezone.now() - timedelta(hours=24)
        posts = posts.filter(created_at__gte=recent_time).order_by('-calculated_score', '-created_at')
        
    elif sort_by == 'controversial':
        posts = posts.annotate(
            total_votes=F('upvotes') + F('downvotes'),
            controversy_score=Case(
                When(total_votes=0, then=0),
                default=F('upvotes') * F('downvotes') / F('total_votes'),
                output_field=FloatField()
            )
        ).filter(total_votes__gt=0).order_by('-controversy_score', '-created_at')
        
    elif sort_by == 'old':
        posts = posts.order_by('created_at')
    else:
        posts = posts.order_by('-created_at')
    
    # Pagination
    paginator = Paginator(posts, 10)
    page = request.GET.get('page')
    posts_page = paginator.get_page(page)
    
    # Get user votes for current page
    upvoted_posts = set()
    downvoted_posts = set()
    if request.user.is_authenticated:
        post_ids = [post.id for post in posts_page]
        if post_ids:
            user_votes = Vote.objects.filter(
                user=request.user,
                post_id__in=post_ids
            ).select_related('post')
            
            for vote in user_votes:
                if vote.is_upvote == True:
                    upvoted_posts.add(vote.post.id)
                elif vote.is_upvote == False:
                    downvoted_posts.add(vote.post.id)
    
    # Get popular tags for sidebar
    popular_tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')[:10]
    
    # Sort options for template
    sort_options = [
        ('hot', 'Hot'),
        ('new', 'New'),
        ('top', 'Top'),
        ('rising', 'Rising'),
        ('controversial', 'Controversial'),
        ('old', 'Old'),
    ]
    
    # Time filter options
    time_options = [
        ('hour', 'Past Hour'),
        ('day', 'Past 24 Hours'),
        ('week', 'Past Week'),
        ('month', 'Past Month'),
        ('year', 'Past Year'),
        ('all', 'All Time'),
    ]
    
    # ADDED: Get selected tag objects for display
    selected_tags = []
    if tag_slugs:
        selected_tags = Tag.objects.filter(slug__in=tag_slugs)
    
    context = {
        'posts': posts_page,
        'popular_tags': popular_tags,
        'selected_tags': selected_tags,  # ADDED: For template display
        'current_tag': tag_slugs[0] if tag_slugs else None,  # For backward compatibility
        'search_query': search_query,
        'upvoted_posts': upvoted_posts,
        'downvoted_posts': downvoted_posts,
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
        
        if vote_type not in ['up', 'down']:
            return JsonResponse({'error': 'Invalid vote type'}, status=400)
        
        is_upvote = vote_type == 'up'
        
        try:
            existing_vote = Vote.objects.get(user=request.user, post=post)
            
            if existing_vote.is_upvote == is_upvote:
                existing_vote.delete()
                action = 'removed'
            else:
                existing_vote.is_upvote = is_upvote
                existing_vote.save()
                action = 'updated'
                
        except Vote.DoesNotExist:
            Vote.objects.create(
                user=request.user,
                post=post,
                is_upvote=is_upvote
            )
            action = 'created'
        
        post.refresh_from_db()
        new_score = post.score
        
        return JsonResponse({
            'success': True,
            'score': new_score,
            'action': action,
            'vote_type': vote_type
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
    upvoted_posts = set()
    downvoted_posts = set()
    if request.user.is_authenticated:
        post_ids = [post.id for post in user_posts]
        if post_ids:  # Only query if there are posts
            user_votes = Vote.objects.filter(
                user=request.user,
                post_id__in=post_ids
            ).select_related('post')
            
            for vote in user_votes:
                if vote.is_upvote == True:
                    upvoted_posts.add(vote.post.id)
                elif vote.is_upvote == False:
                    downvoted_posts.add(vote.post.id)

    return render(request, 'posts/user_profile.html', {
        'user_obj': user_obj,
        'profile': profile,
        'is_following': is_following,
        'user_posts': user_posts,
        'upvoted_posts': upvoted_posts,
        'downvoted_posts': downvoted_posts,
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