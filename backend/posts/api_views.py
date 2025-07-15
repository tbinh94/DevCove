from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Count, Sum, Case, When, IntegerField, Q, F
from django.utils import timezone
from datetime import timedelta
from django.db.models.functions import Coalesce
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.db import connection
from django.urls import reverse
import re
from django.middleware.csrf import get_token

from .models import Post, Comment, Profile, Vote, Tag, Community, Notification, Follow
from .serializers import (
    UserSerializer, UserBasicSerializer, CommunitySerializer,
    CommunityBasicSerializer, TagSerializer, TagBasicSerializer, 
    PostSerializer, PostCreateUpdateSerializer, PostDetailSerializer,
    VoteSerializer, CommentSerializer, ProfileSerializer,
    NotificationSerializer, FollowSerializer
)
from django.views.decorators.csrf import ensure_csrf_cookie
import logging
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse


logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([])
@ensure_csrf_cookie
def get_csrf_token_view(request):
    """
    Enhanced CSRF token endpoint with better error handling
    """
    return JsonResponse({'csrfToken': get_token(request)})

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing posts
    """
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['community', 'author']
    search_fields = ['title', 'content', 'tags__name']
    ordering_fields = ['created_at', 'calculated_score']
    ordering = ['-created_at']

    def get_queryset(self):
        # Cập nhật hàm này
        queryset = Post.objects.annotate(
            num_comments=Count('comments'),  # <-- THÊM DÒNG NÀY
            calculated_score=Coalesce(Sum(Case(
                When(votes__is_upvote=True, then=1),
                When(votes__is_upvote=False, then=-1),
                default=0,
                output_field=IntegerField()
            )), 0)
        ).select_related('author', 'community').prefetch_related('tags', 'comments')

        # Apply filters
        tag_slugs = self.request.query_params.getlist('tag')
        if tag_slugs:
            for tag_slug in tag_slugs:
                queryset = queryset.filter(tags__slug=tag_slug)
            queryset = queryset.distinct()

        # Apply sorting
        sort_by = self.request.query_params.get('sort', 'new')
        time_filter = self.request.query_params.get('time', 'all')

        if sort_by == 'top' and time_filter != 'all':
            now = timezone.now()
            time_threshold = None
            if time_filter == 'day':
                time_threshold = now - timedelta(days=1)
            elif time_filter == 'week':
                time_threshold = now - timedelta(weeks=1)
            elif time_filter == 'month':
                time_threshold = now - timedelta(days=30)
            elif time_filter == 'year':
                time_threshold = now - timedelta(days=365)
            
            if time_threshold:
                queryset = queryset.filter(created_at__gte=time_threshold)

        if sort_by == 'hot':
            # Hot algorithm - you can implement your own logic here
            queryset = queryset.order_by('-calculated_score', '-created_at')
        elif sort_by == 'top':
            queryset = queryset.order_by('-calculated_score', '-created_at')
        else:  # Default to 'new'
            queryset = queryset.order_by('-created_at')

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateUpdateSerializer
        elif self.action == 'retrieve':
            return PostDetailSerializer
        return PostSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        # Only allow author to update their own posts
        if serializer.instance.author != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own posts.")
        serializer.save()

    def perform_destroy(self, instance):
        # Only allow author to delete their own posts
        if instance.author != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own posts.")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def vote(self, request, pk=None):
        """Vote on a post with improved error handling"""
        try:
            post = self.get_object()
            vote_type = request.data.get('vote_type')
            
            # Log the request for debugging
            logger.info(f"Vote request from user {request.user.id} for post {pk}: {vote_type}")
            
            if vote_type not in ['up', 'down']:
                return Response(
                    {'error': 'Invalid vote type. Must be "up" or "down"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
            
            # Recalculate score
            upvotes = post.votes.filter(is_upvote=True).count()
            downvotes = post.votes.filter(is_upvote=False).count()
            new_score = upvotes - downvotes
            
            logger.info(f"Vote {action} successfully. New score: {new_score}")
            
            return Response({
                'score': new_score,
                'action': action,
                'vote_type': vote_type,
                'upvotes': upvotes,
                'downvotes': downvotes,
                'message': f'Vote {action} successfully'
            })
            
        except Exception as e:
            logger.error(f"Error in vote endpoint: {str(e)}")
            return Response(
                {'error': f'An error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def user_vote(self, request, pk=None):
        """Get user's vote for this post"""
        if not request.user.is_authenticated:
            return Response({'user_vote': None})

        post = self.get_object()
        # Lấy đối tượng Vote từ Post model
        vote_object = post.get_user_vote(request.user) 

        # Chuyển đổi đối tượng Vote thành 'up', 'down' hoặc None
        user_vote_status = None
        if vote_object:
            user_vote_status = 'up' if vote_object.is_upvote else 'down'

        return Response({'user_vote': user_vote_status})

    @action(detail=True, methods=['get'])
    def related_posts(self, request, pk=None):
        """Get related posts based on tags"""
        post = self.get_object()
        related_posts = []
        
        if post.tags.exists():
            related_posts = Post.objects.filter(
                tags__in=post.tags.all()
            ).exclude(pk=post.pk).distinct()[:5]
        
        serializer = PostSerializer(related_posts, many=True, context={'request': request})
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing comments
    """
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['post', 'author']
    ordering = ['-created']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own comments.")
        instance.delete()


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for tags (read-only)
    """
    queryset = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')
    serializer_class = TagSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter]
    search_fields = ['name']

    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """Get all posts for this tag"""
        tag = self.get_object()
        posts = Post.objects.filter(tags=tag).annotate(
            num_comments=Count('comments'),
            calculated_score=Coalesce(Sum(Case(
                When(votes__is_upvote=True, then=1),
                When(votes__is_upvote=False, then=-1),
                default=0,
                output_field=IntegerField()
            )), 0)
        ).order_by('-created_at')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class CommunityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing communities
    """
    queryset = Community.objects.all()
    serializer_class = CommunitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.owner != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own communities.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise permissions.PermissionDenied("You can only delete your own communities.")
        instance.delete()

    @action(detail=True, methods=['get'])
    def posts(self, request, slug=None):
        """Get all posts in this community"""
        community = self.get_object()
        posts = Post.objects.filter(community=community).annotate(
            num_comments=Count('comments'),
            calculated_score=Coalesce(Sum(Case(
                When(votes__is_upvote=True, then=1),
                When(votes__is_upvote=False, then=-1),
                default=0,
                output_field=IntegerField()
            )), 0)
        ).order_by('-created_at')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user profiles (read-only)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'username'
    filter_backends = [SearchFilter]
    search_fields = ['username', 'first_name', 'last_name']

    @action(detail=True, methods=['get'])
    def posts(self, request, username=None):
        """Get all posts by this user"""
        user = self.get_object()
        posts = Post.objects.filter(author=user).annotate(
            num_comments=Count('comments'),
            calculated_score=Coalesce(Sum(Case(
                When(votes__is_upvote=True, then=1),
                When(votes__is_upvote=False, then=-1),
                default=0,
                output_field=IntegerField()
            )), 0)
        ).order_by('-created_at')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(posts, request)
        serializer = PostSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def follow_status(self, request, username=None):
        """Check if current user is following this user"""
        target_user = self.get_object()
        is_following = Follow.objects.filter(
            follower=request.user,
            following=target_user
        ).exists()
        
        return Response({'is_following': is_following})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, username=None):
        """Follow/unfollow a user"""
        target_user = self.get_object()
        
        if target_user == request.user:
            return Response(
                {'error': 'You cannot follow yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        follow_obj, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user
        )
        
        if not created:
            follow_obj.delete()
            return Response({
                'action': 'unfollowed',
                'is_following': False,
                'message': f'You unfollowed {username}'
            })
        else:
            return Response({
                'action': 'followed',
                'is_following': True,
                'message': f'You are now following {username}'
            })


class ProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user profiles
    """
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only access their own profile
        return Profile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own profile.")
        serializer.save()


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for notifications (read-only)
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    ordering = ['-created_at']

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent notifications (last 5)"""
        notifications = self.get_queryset()[:5]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'message': f'Marked {count} notifications as read'})

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Clear all notifications"""
        count = self.get_queryset().count()
        self.get_queryset().delete()
        return Response({'message': f'Cleared {count} notifications'})


# Authentication views
@api_view(['POST'])
@permission_classes([])
@ensure_csrf_cookie
def login_view(request):
    """Login API endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    if user:
        login(request, user)
        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'Login successful',
            'user': serializer.data
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([])
@ensure_csrf_cookie
def register_view(request):
    """Registration API endpoint"""
    username = request.data.get('username')
    password = request.data.get('password')
    password_confirm = request.data.get('password_confirm')
    email = request.data.get('email')
    
    if not all([username, password, password_confirm]):
        return Response(
            {'error': 'Username, password, and password confirmation required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if password != password_confirm:
        return Response(
            {'error': 'Passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if email and User.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email
        )
        
        login(request, user)
        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'Registration successful',
            'user': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Registration failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([])  # Changed from IsAuthenticated to allow unauthenticated access
@ensure_csrf_cookie
def logout_view(request):
    """Logout API endpoint"""
    try:
        # Check if user is authenticated before logging out
        if request.user.is_authenticated:
            logout(request)
            return Response({
                'message': 'Logout successful',
                'success': True
            })
        else:
            return Response({
                'message': 'User was not authenticated',
                'success': True
            })
    except Exception as e:
        return Response({
            'error': f'Logout failed: {str(e)}',
            'success': False
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])
def current_user(request):
    """Get current user info"""
    try:
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user, context={'request': request})
            return Response({
                'user': serializer.data,
                'isAuthenticated': True
            })
        else:
            return Response({
                'user': None,
                'isAuthenticated': False
            })
    except Exception as e:
        return Response({
            'user': None,
            'isAuthenticated': False,
            'error': str(e)
        })


# Search API
@api_view(['GET'])
@permission_classes([])
def search_api(request):
    """Unified search API"""
    query = request.GET.get('q', '').strip()
    search_type = request.GET.get('type', 'all')
    
    if len(query) < 2:
        return Response({'posts': [], 'users': []})
    
    results = {'posts': [], 'users': []}
    
    if search_type in ['posts', 'all']:
        posts = search_posts_enhanced(query)
        results['posts'] = format_post_results(posts, request)
    
    if search_type in ['users', 'all']:
        users = search_users_enhanced(query)
        results['users'] = format_user_results(users, request)
    
    return Response(results)


def search_posts_enhanced(query):
    """Enhanced post search with ranking"""
    if connection.vendor == 'postgresql':
        try:
            search_vector = SearchVector('title', weight='A') + SearchVector('content', weight='B')
            search_query = SearchQuery(query)
            
            posts = Post.objects.annotate(
                search=search_vector,
                rank=SearchRank(search_vector, search_query)
            ).filter(
                search=search_query
            ).select_related('author', 'community').order_by('-rank')[:5]
            
            if posts.exists():
                return posts
        except:
            pass
    
    # Fallback search
    posts = Post.objects.filter(
        Q(title__icontains=query) | Q(content__icontains=query)
    ).annotate(
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
        relevance_score=Case(
            When(username__iexact=query, then=100),
            When(username__istartswith=query, then=50),
            When(username__icontains=query, then=10),
            default=0,
            output_field=IntegerField()
        )
    ).select_related('profile').order_by('-relevance_score', '-date_joined')[:5]
    
    return users


def format_post_results(posts, request):
    """Format post results for API response"""
    results = []
    
    for post in posts:
        content_snippet = post.content[:100] + '...' if len(post.content) > 100 else post.content
        
        results.append({
            'id': post.id,
            'title': post.title,
            'content_snippet': content_snippet,
            'author': post.author.username,
            'community': post.community.name if post.community else None,
            'created_at': post.created_at.isoformat(),
            'vote_score': getattr(post, 'calculated_score', 0),
            'comment_count': post.comments.count() if hasattr(post, 'comments') else 0
        })
    
    return results


def format_user_results(users, request):
    """Format user results for API response"""
    results = []
    
    for user in users:
        results.append({
            'id': user.id,
            'username': user.username,
            'karma': getattr(user.profile, 'karma', 0) if hasattr(user, 'profile') else 0,
            'joined': user.date_joined.isoformat(),
            'avatar': user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None,
            'post_count': user.posts.count() if hasattr(user, 'posts') else 0
        })
    
    return results


@api_view(['GET'])
@permission_classes([])
def popular_tags(request):
    """Get popular tags"""
    tags = Tag.objects.annotate(
        post_count=Count('posts')
    ).filter(post_count__gt=0).order_by('-post_count')[:10]
    
    serializer = TagSerializer(tags, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_tag_filter(request):
    """Toggle tag filter (for frontend state management)"""
    tag_slug = request.data.get('tag_slug')
    current_tags = request.data.get('current_tags', [])
    
    if not tag_slug:
        return Response(
            {'error': 'Tag slug required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if tag_slug in current_tags:
        current_tags.remove(tag_slug)
        action = 'removed'
    else:
        current_tags.append(tag_slug)
        action = 'added'
    
    return Response({
        'action': action,
        'current_tags': current_tags,
        'tag_slug': tag_slug
    })


# Helper function for vote data (used in serializers)
def get_user_vote_data_for_posts(user, posts):
    """Get user vote data for posts"""
    upvoted_posts = set()
    downvoted_posts = set()
    
    if not user.is_authenticated:
        return upvoted_posts, downvoted_posts

    post_ids = [post.id for post in posts]
    if not post_ids:
        return upvoted_posts, downvoted_posts

    user_votes = Vote.objects.filter(
        user=user,
        post_id__in=post_ids
    ).values('post_id', 'is_upvote')

    for vote in user_votes:
        if vote['is_upvote']:
            upvoted_posts.add(vote['post_id'])
        else:
            downvoted_posts.add(vote['post_id'])
            
    return upvoted_posts, downvoted_posts