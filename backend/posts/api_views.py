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
from rest_framework.permissions import AllowAny # Allow anyone to register
from rest_framework.views import APIView

from .models import Post, Comment, Profile, Vote, Tag, Community, Notification, Follow
from .serializers import (
    UserSerializer, UserBasicSerializer, CommunitySerializer,
    CommunityBasicSerializer, TagSerializer, TagBasicSerializer,
    PostSerializer, PostCreateUpdateSerializer, PostDetailSerializer,
    VoteSerializer, CommentSerializer, ProfileSerializer,
    NotificationSerializer,  ProfileUpdateSerializer
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

        # Filter by author username for the posts_list_api functionality
        author_username = self.request.query_params.get('author')
        if author_username:
            queryset = queryset.filter(author__username=author_username)

        author_username_alt = self.request.query_params.get('author_username')
        if author_username_alt:
            queryset = queryset.filter(author__username=author_username_alt)

        user_param = self.request.query_params.get('user')
        if user_param:
            queryset = queryset.filter(author__username=user_param)

        created_by = self.request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(author__username=created_by)


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

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """
        Get all comments for a specific post.
        """
        post = self.get_object()
        comments = post.comments.all().order_by('-created') # Assuming 'comments' is the related_name for Comment model's ForeignKey to Post, and 'created' is the field for creation timestamp

        # Paginate comments if needed, similar to other list views
        paginator = StandardResultsSetPagination() # Use your existing pagination class
        page = paginator.paginate_queryset(comments, request)

        serializer = CommentSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


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
        """
        Get posts by specific user
        """
        try:
            user = get_object_or_404(User, username=username)
            posts = Post.objects.filter(author=user).order_by('-created_at')

            serializer = PostSerializer(posts, many=True, context={'request': request})

            return Response({
                'results': serializer.data,
                'count': posts.count(),
                'username': username
            })

        except User.DoesNotExist:
            return Response(
                {'error': f'User "{username}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )


    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def follow_status(self, request, username=None):
        """
        Check if current user is following specified user
        """
        try:
            user = get_object_or_404(User, username=username)

            is_following = Follow.objects.filter(
                follower=request.user,
                following=user
            ).exists()

            return Response({
                'is_following': is_following,
                'username': username
            })

        except User.DoesNotExist:
            return Response(
                {'error': f'User "{username}" not found'},
                status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def follow(self, request, username=None):
        """
        Follow/unfollow a user
        """
        try:
            user_to_follow = get_object_or_404(User, username=username)

            # Can't follow yourself
            if user_to_follow == request.user:
                return Response(
                    {'error': 'Cannot follow yourself'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if already following
            follow_obj, created = Follow.objects.get_or_create(
                follower=request.user,
                following=user_to_follow
            )

            if not created:
                # Already following, so unfollow
                follow_obj.delete()
                following = False
            else:
                # Just followed
                following = True

            # Get updated follower count
            follower_count = Follow.objects.filter(following=user_to_follow).count()

            return Response({
                'following': following,
                'follower_count': follower_count,
                'username': username,
                'message': f'Successfully {"followed" if following else "unfollowed"} {username}'
            })

        except User.DoesNotExist:
            return Response(
                {'error': f'User "{username}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticatedOrReadOnly])
    def profile(self, request, username=None):
        """
        Get user profile with posts - FIXED for avatar URL
        """
        try:
            user = get_object_or_404(User, username=username)

            # Get user's profile
            profile, created = Profile.objects.get_or_create(user=user)

            # Get user's posts
            posts = Post.objects.filter(author=user).order_by('-created_at')

            # Check if current user is following this user
            is_following = False
            if request.user.is_authenticated:
                is_following = Follow.objects.filter(
                    follower=request.user,
                    following=user
                ).exists()

            # Get follower/following counts
            follower_count = Follow.objects.filter(following=user).count()
            following_count = Follow.objects.filter(follower=user).count()

            # Serialize posts with context
            posts_serializer = PostSerializer(posts, many=True, context={'request': request})

            # FIXED: Create avatar_url with better error handling
            avatar_url = None
            if profile.avatar:
                try:
                    # Build the full URL using request.build_absolute_uri
                    avatar_url = request.build_absolute_uri(profile.avatar.url)
                    print(f"DEBUG: Built avatar URL: {avatar_url}")  # Debug log
                except (ValueError, AttributeError, Exception) as e:
                    print(f"DEBUG: Error building avatar URL: {e}")  # Debug log
                    avatar_url = None

            # FIXED: Also try using the ProfileSerializer to get avatar_url
            profile_serializer = ProfileSerializer(profile, context={'request': request})
            serialized_avatar_url = profile_serializer.data.get('avatar_url')
            
            print(f"DEBUG: Serializer avatar_url: {serialized_avatar_url}")  # Debug log
            
            # Use serializer's avatar_url if available, otherwise use manual one
            final_avatar_url = serialized_avatar_url or avatar_url

            return Response({
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'date_joined': user.date_joined,
                    'follower_count': follower_count,
                    'following_count': following_count,
                },
                'profile': {
                    'bio': profile.bio,
                    'avatar_url': final_avatar_url,  # FIXED: Use the processed avatar URL
                    'joined_date': user.date_joined,
                },
                'posts': posts_serializer.data,
                'is_following': is_following
            })

        except User.DoesNotExist:
            return Response(
                {'error': f'User "{username}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"DEBUG: Error in profile view: {e}")  # Debug log
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet được cải tiến để xem và cập nhật user profiles.
    - Cho phép tra cứu profile bằng username.
    - Sử dụng serializer riêng cho việc cập nhật (PATCH).
    - Đảm bảo chỉ chủ sở hữu mới có quyền chỉnh sửa.
    """
    queryset = Profile.objects.select_related('user').all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'user__username'  # Sửa: Dùng username của user để tra cứu
    lookup_url_kwarg = 'user__username' # Chỉ định tên kwarg trong URL

    def get_serializer_class(self):
        """
        Trả về serializer phù hợp với hành động.
        - ProfileUpdateSerializer cho 'partial_update' (PATCH).
        - ProfileSerializer cho các hành động khác (GET).
        """
        if self.action == 'partial_update':
            return ProfileUpdateSerializer
        return ProfileSerializer

    def get_permissions(self):
        """
        Yêu cầu quyền IsAuthenticated cho việc cập nhật.
        Bất kỳ ai cũng có thể xem (IsAuthenticatedOrReadOnly).
        """
        if self.action in ['partial_update', 'update']:
            self.permission_classes = [IsAuthenticated]
        return super().get_permissions()

    def perform_update(self, serializer):
        """
        Kiểm tra quyền trước khi lưu.
        Người dùng chỉ có thể cập nhật profile của chính mình.
        """
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You do not have permission to edit this profile.")
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        """
        Ghi đè hành vi PATCH để trả về đối tượng User hoàn chỉnh sau khi cập nhật.
        """
        instance = self.get_object()
        
        # Kiểm tra quyền
        if instance.user != request.user:
            raise permissions.PermissionDenied("You do not have permission to edit this profile.")
            
        serializer = ProfileUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save() # Lưu các thay đổi vào DB

        # Sau khi lưu, tạo một response mới sử dụng UserSerializer
        # để trả về dữ liệu user hoàn chỉnh, bao gồm cả profile đã cập nhật.
        updated_user_data = UserSerializer(instance.user, context={'request': request}).data
        return Response(updated_user_data)
    



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