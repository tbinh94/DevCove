import json
import logging
import os
import re
from datetime import timedelta
import requests 
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import connection
from django.db.models import Case, Count, F, IntegerField, Q, Sum, When
from django.db.models.functions import Coalesce
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse

from rest_framework import permissions, status, viewsets # permissions is added here!
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from django_filters.rest_framework import DjangoFilterBackend

from .models import Comment, Community, Follow, Notification, Post, Profile, Tag, Vote
from .serializers import (
    CommunityBasicSerializer,
    CommunitySerializer,
    CommentSerializer,
    NotificationSerializer,
    PostCreateUpdateSerializer,
    PostDetailSerializer,
    PostSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    TagBasicSerializer,
    TagSerializer,
    UserBasicSerializer,
    UserSerializer,
    VoteSerializer,
)

logger = logging.getLogger(__name__)
# Import thư viện Gemini
from google import genai
# Import dotenv để tải biến môi trường từ file .env (khuyên dùng)
from dotenv import load_dotenv



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
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['community', 'author']
    search_fields = ['title', 'content', 'tags__name']
    ordering_fields = ['created_at', 'calculated_score']
    ordering = ['-created_at']

    # THAY THẾ HÀM get_queryset CŨ BẰNG HÀM MỚI NÀY
    def get_queryset(self):
        """
        Ghi đè queryset để xử lý filter theo tags.
        """
        # Bắt đầu với queryset cơ bản
        queryset = Post.objects.select_related('author', 'community') \
                               .prefetch_related('tags', 'votes') \
                               .all().order_by('-created_at')

        # Lấy tham số 'tags' từ URL (ví dụ: ?tags=cv,coding)
        tags_param = self.request.query_params.get('tags', None)

        if tags_param:
            # Tách chuỗi thành một danh sách các slug (ví dụ: ['cv', 'coding'])
            tag_slugs = [slug.strip() for slug in tags_param.split(',')]
            
            # Lọc các bài viết có tag với slug nằm trong danh sách trên
            # tags__slug__in là cú pháp của Django để lọc trên trường của quan hệ ManyToMany
            queryset = queryset.filter(tags__slug__in=tag_slugs).distinct()

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        if self.action == 'retrieve':
            return PostDetailSerializer
        return PostSerializer

    def perform_create(self, serializer):
        # Hàm này sẽ được gọi sau khi serializer.is_valid()
        # Logic gán author và tags đã được chuyển vào serializer
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Ghi đè hàm create để xử lý trường hợp tag_ids được gửi dưới dạng chuỗi JSON
        từ FormData (khi upload ảnh).
        """
        data = request.data.copy()

        # Nếu request là multipart/form-data, tag_ids có thể là một chuỗi JSON
        # Cần phải parse nó thành list.
        if 'tag_ids' in data and isinstance(data['tag_ids'], str):
            try:
                # Chuyển chuỗi JSON thành list Python
                tag_ids_list = json.loads(data['tag_ids'])
                # Cập nhật lại data để serializer có thể xử lý
                data.setlist('tag_ids', [str(tid) for tid in tag_ids_list])
            except json.JSONDecodeError:
                return Response({'error': 'Invalid format for tag_ids.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def ask_bot(self, request, pk=None):
        """
        Enhanced AI code analysis using Google Gemini API with improved prompts and response processing.
        """
        # 1. Fetch Post
        post = self.get_object()

        # 2. Extract metadata from request (optional enhancements)
        language = request.data.get('language')  # e.g., 'python', 'javascript'
        framework = request.data.get('framework')  # e.g., 'django', 'react'
        focus_areas = request.data.get('focus_areas', [])  # e.g., ['security', 'performance']

        # 3. Build enhanced, context-aware prompt
        enhanced_prompt = build_enhanced_prompt(
            content=post.content,
            language=language,
            framework=framework,
            focus_areas=focus_areas
        )

        # 4. Load environment variables
        load_dotenv()

        # 5. Initialize Gemini client
        try:
            client = genai.Client()
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client. Check GEMINI_API_KEY environment variable. Error: {e}")
            return Response(
                {'error': 'AI service is not configured. Please check API configuration.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 6. Call Gemini API with enhanced prompt
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=enhanced_prompt
            )
            ai_text = response.text
            
            # Log for debugging
            logger.info(f"Gemini API response received for post {post.id}, length: {len(ai_text) if ai_text else 0}")

            if not ai_text or len(ai_text.strip()) == 0:
                return Response(
                    {'error': 'AI service returned empty response. Please try again.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )

        except Exception as e:
            logger.error(f"Error calling Gemini API for post {post.id}: {e}")
            return Response(
                {'error': f'AI analysis failed: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # 7. Process AI response for better formatting and metadata
        try:
            processed_response = process_ai_response(ai_text, post)
            response_summary = extract_summary(ai_text)
            
        except Exception as e:
            logger.warning(f"Error processing AI response: {e}")
            # Fallback to raw response if processing fails
            processed_response = ai_text
            response_summary = {}

        # 8. Save BotSession for analytics and debugging
        try:
            from .models import BotSession
            BotSession.objects.create(
                post=post,
                request_payload={
                    "model": "gemini-2.5-flash",
                    "prompt": enhanced_prompt,
                    "metadata": {
                        "language": language,
                        "framework": framework,
                        "focus_areas": focus_areas,
                        "user_id": request.user.id,
                        "content_length": len(post.content)
                    }
                },
                response_text=processed_response,
                response_metadata=response_summary
            )
            logger.info(f"BotSession saved for post {post.id}")
        except ImportError:
            logger.info("BotSession model not found, skipping session logging")
        except Exception as e:
            logger.error(f"Error saving BotSession for post {post.id}: {e}")

        # 9. Create the enhanced bot comment
        try:
            bot_comment = Comment.objects.create(
                post=post,
                author=request.user,
                text=processed_response,
                is_bot=True
            )

            # 10. Create notification for post author (if different from requester)
            if post.author != request.user:
                try:
                    from .models import Notification
                    Notification.objects.create(
                        recipient=post.author,
                        type='bot_analysis',
                        message=f"AI analyzed your post: {post.title[:50]}...",
                        related_object_id=post.id,
                        actor=request.user
                    )
                except Exception as e:
                    logger.warning(f"Failed to create notification: {e}")

            # 11. Return enhanced response with metadata
            serializer = CommentSerializer(bot_comment, context={'request': request})
            
            return Response({
                **serializer.data,
                'analysis_metadata': {
                    'quality_score': response_summary.get('quality_score'),
                    'has_critical_issues': response_summary.get('has_critical_issues', False),
                    'has_suggestions': response_summary.get('has_suggestions', False),
                    'sections_found': response_summary.get('sections_found', 0),
                    'processing_time': timezone.now().isoformat(),
                    'language': language,
                    'framework': framework
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error creating bot comment for post {post.id}: {e}")
            return Response(
                {'error': 'Failed to save AI analysis. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



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
    queryset = Tag.objects.all().order_by('name')
    serializer_class = TagSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter]
    search_fields = ['name']
    lookup_field = 'slug'

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
    ViewSet for notifications (read-only) - OPTIMIZED
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """
        Return notifications for the current authenticated user.
        """
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='count', url_name='count_and_recent')
    def count_and_recent(self, request):
        """
        Returns the unread notification count and a list of recent notifications.
        This single endpoint is more efficient for the frontend dropdown.
        """
        user_notifications = self.get_queryset()
        
        unread_count = user_notifications.filter(is_read=False).count()
        
        # Get the 10 most recent notifications for the dropdown
        recent_notifications = user_notifications[:10]
        
        serializer = self.get_serializer(recent_notifications, many=True)
        
        return Response({
            'count': unread_count,
            'notifications': serializer.data
        })

    @action(detail=True, methods=['post']) # Changed from PATCH to POST to match frontend
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'message': 'Notification marked as read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read') # Changed from PATCH to POST and added url_path
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({
            'success': True,
            'message': f'Marked {updated_count} notifications as read'
        })

    @action(detail=False, methods=['post']) # Changed from DELETE to POST for CSRF simplicity
    def clear_all(self, request):
        """Clear all notifications"""
        count, _ = self.get_queryset().delete()
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tag(request):
    """
    Tạo một tag mới nếu nó chưa tồn tại, với logic chuẩn hóa đầu vào.
    API này được gọi từ frontend khi người dùng nhập một tag mới.
    """
    original_name = request.data.get('name', '').strip()
    if not original_name:
        return Response({'error': 'Tag name is required'}, status=status.HTTP_400_BAD_REQUEST)

    if len(original_name) > 50:
        return Response({'error': 'Tag name cannot exceed 50 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    normalized_name = slugify(original_name, allow_unicode=False)
    
    if not normalized_name:
        return Response({'error': 'Invalid tag name after normalization.'}, status=status.HTTP_400_BAD_REQUEST)
        
    tag, created = Tag.objects.get_or_create(
        slug=normalized_name,
        defaults={'name': original_name, 'slug': normalized_name}
    )
    
    serializer = TagSerializer(tag)
    response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(serializer.data, status=response_status)


def build_enhanced_prompt(content, language=None, framework=None, focus_areas=None):
    """Build context-aware prompt based on provided metadata"""
    context_parts = []
    if language:
        context_parts.append(f"Programming Language: {language}")
    if framework:
        context_parts.append(f"Framework/Library: {framework}")

    context = "\n".join(context_parts) + "\n" if context_parts else ""

    focus_instruction = ""
    if focus_areas:
        focus_instruction = f"\nPay special attention to: {', '.join(focus_areas)}\n"

    return f"""You are a senior software engineer conducting a thorough code review. Analyze this code and provide actionable, educational feedback.{context}CODE TO REVIEW:
```{content}```
{focus_instruction}
Please provide your analysis in a natural, conversational format with clear sections. Use plain text without markdown symbols (**, ##, etc). Structure your response as follows:
🎯 OVERALL ASSESSMENT
Quality Score: X/10
Complexity Level: [Low/Medium/High]
Maintainability: [Poor/Fair/Good/Excellent]
✅ STRENGTHS
List what's done well with specific examples.
🚨 CRITICAL ISSUES
Identify any security vulnerabilities or bugs that break functionality.
⚠️ IMPROVEMENTS NEEDED
Point out performance, architecture, or maintainability issues.
💡 ENHANCEMENT SUGGESTIONS
Recommend code style improvements and best practices.
🔧 SPECIFIC CODE FIXES
For each major issue, provide:
Issue: Clear description
Solution: Specific code changes needed
Impact: Why this change improves the code
📈 PRIORITY ACTION ITEMS
List the most important fixes in order of priority.
📚 LEARNING RESOURCES
Include relevant documentation or best practices if applicable.
Write in a natural, conversational tone. Be constructive and educational. Include code examples where helpful. Focus on helping the developer learn and grow. Do NOT use markdown formatting symbols like **, ##, [], etc. Write everything in plain text.
"""

def process_ai_response(ai_text, post):
    """Process and enhance AI response before saving"""
    # Add metadata header in plain text
    header = f"🤖 AI Code Review for Post #{post.id}\nGenerated on {timezone.now().strftime('%Y-%m-%d at %H:%M UTC')}\n\n"

    # Clean up any remaining markdown artifacts from AI response
    cleaned_text = clean_markdown_artifacts(ai_text)

    # Process the AI text
    processed = header + cleaned_text

    # Add footer with disclaimers in plain text
    footer = "\n\n" + "="*50 + "\n💡 This analysis was generated by AI. Please review suggestions carefully, test any code changes, and consider getting human review for critical applications."

    return processed + footer

def clean_markdown_artifacts(text):
    """Remove markdown formatting artifacts from AI response"""
    # Remove markdown headers (## -> empty, keep emoji and text)
    text = re.sub(r'^##\s*', '', text, flags=re.MULTILINE)

    # Remove bold markdown (**text** -> text)
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)

    # Remove italic markdown (*text* -> text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)

    # Remove markdown list markers (- or * at start of line)
    text = re.sub(r'^[\s]*[-\*]\s*', '', text, flags=re.MULTILINE)

    # Remove brackets from [text] -> text
    text = re.sub(r'\[(.*?)\]', r'\1', text)

    # Clean up multiple newlines
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)

    return text.strip()

def extract_summary(ai_text):
    """Extract key points for API response summary"""
    summary = {
        'has_critical_issues': '🚨' in ai_text or 'Critical' in ai_text.lower(),
        'has_suggestions': '💡' in ai_text or 'suggestion' in ai_text.lower(),
        'has_code_fixes': '🔧' in ai_text or 'fix' in ai_text.lower(),
        'estimated_length': len(ai_text),
        'sections_found': len([line for line in ai_text.split('\n') if line.startswith('🎯') or line.startswith('✅') or line.startswith('🚨') or line.startswith('⚠️') or line.startswith('💡') or line.startswith('🔧') or line.startswith('📈') or line.startswith('📚')]), # Adjusted to match the plain text headings
        'quality_score': extract_quality_score(ai_text)
    }
    return summary

def extract_quality_score(ai_text):
    """Extract quality score from AI response if present"""
    # Look for patterns like "Quality Score: 7/10" or "Score: 8/10"
    score_pattern = r'(?:Quality Score|Score):\s*(\d+)/10'
    match = re.search(score_pattern, ai_text, re.IGNORECASE)
    return int(match.group(1)) if match else None