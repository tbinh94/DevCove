import json
import logging
import os
import re
import time
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
from rest_framework.decorators import action

# Import thư viện Gemini
from google import genai
client = genai.Client()

# =====>>>>> CHỈNH SỬA QUAN TRỌNG <<<<<=====
import prompts
from ai_formatter import AICommentFormatter # Đảm bảo import formatter
from prompts import build_prompt, TASK_PROMPTS
# ==========================================

from django.db.models import Max, Q
from rest_framework import permissions, status, viewsets
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
from .models import Comment, Community, Follow, Notification, Post, Profile, Tag, Vote, BotSession
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
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

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

        # ===== THÊM FILTER CHO BOT REVIEWED =====
        bot_reviewed = self.request.query_params.get('bot_reviewed', None)
        if bot_reviewed is not None:
            if bot_reviewed.lower() in ['true', '1', 'yes']:
                # Chỉ lấy posts đã được bot review
                queryset = queryset.filter(comments__is_bot=True).distinct()
            elif bot_reviewed.lower() in ['false', '0', 'no']:
                # Chỉ lấy posts chưa được bot review
                queryset = queryset.exclude(comments__is_bot=True)
        
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
        try:
            post = self.get_object()
            five_minutes_ago = timezone.now() - timedelta(minutes=5)
            # Spam protection
            if BotSession.objects.filter(post=post, created_at__gte=five_minutes_ago).exists():
                return Response({'error': 'An AI analysis for this post was requested recently. Please wait a few minutes.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            user_prompt_text = request.data.get('prompt_text', '').strip()
            prompt_type = request.data.get('prompt_type')
            if not prompt_type:
                return Response({'error': 'prompt_type is required.'}, status=status.HTTP_400_BAD_REQUEST)
            if prompt_type not in TASK_PROMPTS and prompt_type != 'custom_analysis':
                return Response({'error': f'Invalid prompt_type.'}, status=status.HTTP_400_BAD_REQUEST)

            language = request.data.get('language', getattr(post, 'language', 'text'))
            additional_params = self._process_prompt_parameters(request, prompt_type, user_prompt_text, language)
            
            final_prompt = prompts.build_prompt(
                content=post.content,
                language=language,
                prompt_type=prompt_type,
                user_prompt_text=user_prompt_text,
                **additional_params
            )

            ai_response_text = self._get_ai_analysis(final_prompt)
            if isinstance(ai_response_text, Response):
                return ai_response_text
            
            # =====>>>>> SỬA Ở ĐÂY <<<<<=====
            # Luôn dùng formatter để tạo HTML
            formatter = AICommentFormatter()
            formatted_html = formatter.format_full_response(ai_response_text, post)
            # ==============================

            bot_comment = self._create_bot_comment(post, request.user, formatted_html)
            self._create_notification(post, request.user)
            self._log_bot_session(post, request, ai_response_text, {})

            serializer = CommentSerializer(bot_comment, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Critical error in ask_bot for post {pk}: {e}")
            return Response({'error': 'A critical error occurred.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def _process_prompt_parameters(self, request, prompt_type, user_prompt_text, language):
        """
        Xử lý các tham số bổ sung cho từng loại prompt
        """
        additional_params = {}
        
        if prompt_type == 'guide_library_usage':
            additional_params.update({
                'entity_type': request.data.get('entity_type', 'Library'),
                'entity_name': request.data.get('entity_name', 'Unknown Library')
            })
        elif prompt_type == 'explain_cs_concept':
            additional_params['concept_name'] = request.data.get('concept_name', 'Programming Concept')
        elif prompt_type == 'generate_snippet':
            additional_params['functionality'] = request.data.get('functionality', 'requested functionality')
        elif prompt_type == 'generate_full_code':
            additional_params['user_request'] = user_prompt_text or 'Generate code as requested'
        elif prompt_type == 'generate_tests':
            additional_params['language'] = language
        elif prompt_type == 'generate_comments_docs':
            additional_params['document_type'] = request.data.get('document_type', 'Code Comments')
        elif prompt_type == 'translate_code':
            additional_params.update({
                'source_language': request.data.get('source_language', language),
                'target_language': request.data.get('target_language', 'python')
            })
        elif prompt_type == 'ci_cd_integration':
            additional_params['platform_name'] = request.data.get('platform_name', 'GitHub Actions')
        
        return additional_params

    def _validate_prompt_parameters(self, prompt_type, additional_params, request_data):
        """
        Validate required parameters cho specific prompt types
        """
        if prompt_type == 'guide_library_usage':
            if not request_data.get('entity_name'):
                return 'entity_name is required for guide_library_usage'
                
        elif prompt_type == 'explain_cs_concept':
            if not request_data.get('concept_name'):
                return 'concept_name is required for explain_cs_concept'
                
        elif prompt_type == 'generate_snippet':
            if not request_data.get('functionality'):
                return 'functionality is required for generate_snippet'
                
        elif prompt_type == 'translate_code':
            if not request_data.get('target_language'):
                return 'target_language is required for translate_code'
                
        elif prompt_type == 'ci_cd_integration':
            if not request_data.get('platform_name'):
                return 'platform_name is required for ci_cd_integration'
        
        return None

    def _get_ai_analysis(self, prompt: str):
        """Gets AI analysis from Gemini API using the final prompt string."""
        load_dotenv()
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt 
            )
            
            ai_text = response.text
            if not ai_text or not ai_text.strip():
                return Response({'error': 'AI returned an empty response.'}, status=status.HTTP_502_BAD_GATEWAY)
            
            return ai_text
            
        except Exception as e:
            logger.error(f"AI service failed: {e}")
            return Response({'error': f'AI service failed: {str(e)}'}, status=status.HTTP_502_BAD_GATEWAY)

    def _create_bot_comment(self, post, user, formatted_response):
        """Create bot comment with formatted response."""
        return Comment.objects.create(
            post=post,
            author=user,
            text=formatted_response,
            is_bot=True
        )

    def _create_notification(self, post, user):
        """Create notification for post author, handling potential errors."""
        if post.author != user:
            try:
                Notification.objects.create(
                    recipient=post.author,
                    type='bot_analysis',
                    message=f"Your post '{post.title[:30]}...' has been analyzed by the AI.",
                    related_object_id=post.id,
                    actor=user
                )
            except Exception as e:
                logger.warning(f"Non-critical error: Failed to create notification for post {post.id}. Error: {e}")

    def _log_bot_session(self, post, request, ai_response, summary):
        """Log bot session with enhanced metadata"""
        try:
            BotSession.objects.create(
                post=post,
                request_payload={
                    "model": "gemini-2.5-flash",
                    "prompt_type": summary.get('prompt_type'),
                    "metadata": {
                        "language": summary.get('language'),
                        "user_id": request.user.id,
                        "content_length": len(post.content),
                        "prompt_type": summary.get('prompt_type'),
                        "user_prompt_text_length": summary.get('user_prompt_length', 0),
                        "additional_params": summary.get('additional_params', {}),
                        "processing_timestamp": summary.get('processing_timestamp'),
                        "prompt_title": summary.get('prompt_title')
                    }
                },
                response_text=ai_response,
                response_metadata=summary
            )
            logger.info(f"BotSession saved successfully for post {post.id}")
        except Exception as e:
            logger.error(f"Non-critical error: Failed to save BotSession for post {post.id}. Error: {e}")

    def _build_success_response(self, bot_comment, summary, request):
        """Build the final success response for the client."""
        logger.info(f"AI Analysis Summary for Post {bot_comment.post.id}: {summary}")
        
        serializer = CommentSerializer(bot_comment, context={'request': request})
        
        response_data = serializer.data
        response_data['analysis_metadata'] = {
            'prompt_type': summary.get('prompt_type'),
            'prompt_title': summary.get('prompt_title'),
            'language': summary.get('language'),
            'processing_time': summary.get('processing_timestamp'),
            'additional_params': summary.get('additional_params', {})
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def bot_reviewed_posts(self, request):
        """
        Lấy danh sách các posts đã được bot review với thống kê chi tiết
        """
        posts = Post.objects.filter(
            comments__is_bot=True
        ).distinct().select_related(
            'author', 'community'
        ).prefetch_related(
            'tags', 'comments'
        ).annotate(
            bot_comments_count=Count('comments', filter=Q(comments__is_bot=True)),
            latest_bot_review_date=Max('comments__created', filter=Q(comments__is_bot=True))
        ).order_by('-latest_bot_review_date')
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def bot_review_stats(self, request):
        """
        Thống kê về bot reviews
        """
        total_posts = Post.objects.count()
        reviewed_posts = Post.objects.filter(comments__is_bot=True).distinct().count()
        total_bot_comments = Comment.objects.filter(is_bot=True).count()
        
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_reviews = Comment.objects.filter(
            is_bot=True,
            created__gte=seven_days_ago
        ).count()
        
        return Response({
            'total_posts': total_posts,
            'reviewed_posts_count': reviewed_posts,
            'review_percentage': round((reviewed_posts / total_posts * 100), 2) if total_posts > 0 else 0,
            'total_bot_comments': total_bot_comments,
            'recent_reviews_7days': recent_reviews,
            'average_reviews_per_post': round(total_bot_comments / reviewed_posts, 2) if reviewed_posts > 0 else 0
        })

    # === NEW ACTION: GET AVAILABLE PROMPT TYPES ===
    @action(detail=False, methods=['get'], permission_classes=[])
    def available_prompt_types(self, request):
        """
        Trả về danh sách các prompt types có sẵn với metadata
        """
        prompt_options = []
        
        for prompt_key, prompt_data in TASK_PROMPTS.items():
            prompt_options.append({
                'key': prompt_key,
                'title': prompt_data['title'],
                'description': self._extract_description_from_instruction(prompt_data['instruction']),
                'required_params': self._get_required_params_for_prompt(prompt_key)
            })
        
        # Thêm custom analysis option
        prompt_options.append({
            'key': 'custom_analysis',
            'title': '❓ Yêu cầu tùy chỉnh',
            'description': 'Đặt câu hỏi hoặc yêu cầu tùy chỉnh về code',
            'required_params': ['prompt_text']
        })
        
        return Response({
            'available_prompts': prompt_options,
            'total_count': len(prompt_options)
        })

    def _extract_description_from_instruction(self, instruction):
        """
        Trích xuất mô tả ngắn gọn từ instruction
        """
        # Lấy dòng đầu tiên sau title làm description
        lines = instruction.strip().split('\n')
        for line in lines[1:]:  # Skip title line
            if line.strip() and not line.startswith('## ') and not line.startswith('- '):
                return line.strip()[:100] + ('...' if len(line.strip()) > 100 else '')
        return "No description available"

    def _get_required_params_for_prompt(self, prompt_key):
        """
        Trả về danh sách các tham số bắt buộc cho prompt type
        """
        required_params_map = {
            'guide_library_usage': ['entity_name'],
            'explain_cs_concept': ['concept_name'],
            'generate_snippet': ['functionality'],
            'translate_code': ['target_language'],
            'ci_cd_integration': ['platform_name'],
            'generate_comments_docs': ['document_type'],
        }
        return required_params_map.get(prompt_key, [])

    # === NEW ACTION: GENERATE OVERVIEW FOR A LIST OF POSTS ===
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_overview(self, request):
        """
        Nhận một danh sách ID bài đăng và tạo ra một bản tóm tắt tổng quan bằng AI.
        """
        post_ids = request.data.get('post_ids', [])
        if not post_ids:
            return Response({'error': 'post_ids list is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(post_ids) > 30:
            return Response({'error': 'Cannot analyze more than 30 posts at once.'}, status=status.HTTP_400_BAD_REQUEST)

        posts = Post.objects.filter(id__in=post_ids)
        if not posts.exists():
            return Response({'error': 'No valid posts found for the given IDs.'}, status=status.HTTP_404_NOT_FOUND)

        aggregated_content = ""
        for post in posts:
            aggregated_content += f"--- START POST (ID: {post.id}) ---\n"
            aggregated_content += f"TITLE: {post.title}\n"
            aggregated_content += f"CONTENT: {post.content}\n"
            aggregated_content += f"--- END POST (ID: {post.id}) ---\n\n"

        final_prompt = prompts.build_prompt(
            content=aggregated_content,
            language='multiple posts',
            prompt_type='summarize_post_list',
            user_prompt_text=''
        )
        logger.info(f"Generating overview for {len(posts)} posts.")
        
        ai_response_text = self._get_ai_analysis(final_prompt)
        if isinstance(ai_response_text, Response):
            return ai_response_text
            
        # =====>>>>> SỬA Ở ĐÂY <<<<<=====
        # Sử dụng formatter cho kết quả overview
        formatter = AICommentFormatter()
        # Ở đây `post` có thể là `None` vì ta đang xử lý nhiều post
        formatted_overview = formatter.format_full_response(ai_response_text, post=None) 
        # ==============================

        # Trả về HTML đã được format
        return Response({'overview': formatted_overview}, status=status.HTTP_200_OK)




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

    @action(detail=False, methods=['POST'], permission_classes=[IsAuthenticated])
    def update_helper_status(self, request):
        """
        Tính toán lại trạng thái 'is_weekly_helper' cho tất cả người dùng.
        Đây là một tác vụ nặng và nên được chạy định kỳ (ví dụ: qua cron job).
        Một người dùng là "Weekly Helper" nếu họ bình luận trên bài viết của ít nhất 3 tác giả khác nhau
        trong 7 ngày qua (không tính bài viết của chính họ).
        """
        one_week_ago = timezone.now() - timedelta(days=7)

        # 1. Đặt lại tất cả helper về False để bắt đầu
        Profile.objects.update(is_weekly_helper=False)

        # 2. Tìm các ứng cử viên helper trong một truy vấn hiệu quả
        helper_candidates = Comment.objects.filter(
            created__gte=one_week_ago
        ).exclude(
            post__author=F('author')  # Loại trừ việc bình luận trên bài của chính mình
        ).values(
            'author'  # Nhóm theo người bình luận
        ).annotate(
            helped_authors_count=Count('post__author', distinct=True)
        ).filter(
            helped_authors_count__gte=3
        )

        # 3. Lấy ID của những người dùng đủ điều kiện
        helper_user_ids = [item['author'] for item in helper_candidates]

        # 4. Cập nhật hàng loạt các profile của những người dùng đủ điều kiện
        updated_count = 0
        if helper_user_ids:
            updated_count = Profile.objects.filter(user_id__in=helper_user_ids).update(is_weekly_helper=True)

        return Response({
            "message": f"Đã cập nhật thành công trạng thái helper. {updated_count} người dùng được đánh dấu là helper.",
            "status": "success"
        })

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
        Get user profile with posts - REVISED to use serializers for consistency.
        """
        try:
            user = get_object_or_404(User, username=username)

            # Get user's profile, create if it doesn't exist
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
            
            # Use serializers to construct the response
            user_serializer = UserSerializer(user, context={'request': request})
            profile_serializer = ProfileSerializer(profile, context={'request': request})
            posts_serializer = PostSerializer(posts, many=True, context={'request': request})
            
            # Combine data into the expected structure for the frontend
            response_data = {
                'user': user_serializer.data,
                'profile': profile_serializer.data,
                'posts': posts_serializer.data,
                'is_following': is_following
            }

            # For backward compatibility, ensure follower counts are also on user object if frontend expects it there.
            response_data['user']['follower_count'] = profile_serializer.data.get('followers_count', 0)
            response_data['user']['following_count'] = profile_serializer.data.get('following_count', 0)

            return Response(response_data)

        except User.DoesNotExist:
            return Response(
                {'error': f'User "{username}" not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error in profile view for {username}: {e}", exc_info=True)
            return Response(
                {'error': 'An internal server error occurred.'},
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
        Profile.objects.create(user=user)

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
    Tạo một tag mới nếu nó chưa tồn tại, với hỗ trợ ký tự đặc biệt.
    API này được gọi từ frontend khi người dùng nhập một tag mới.
    """
    original_name = request.data.get('name', '').strip()
    if not original_name:
        return Response({'error': 'Tag name is required'}, status=status.HTTP_400_BAD_REQUEST)

    if len(original_name) > 50:
        return Response({'error': 'Tag name cannot exceed 50 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    # Tạo slug tùy chỉnh hỗ trợ ký tự đặc biệt
    def create_custom_slug(name):
        """
        Tạo slug tùy chỉnh cho tag, giữ lại các ký tự đặc biệt quan trọng
        """
        # Chuyển về lowercase
        slug = name.lower()
        
        # Thay thế khoảng trắng bằng dấu gạch ngang
        slug = re.sub(r'\s+', '-', slug)
        
        # Giữ lại các ký tự: chữ cái, số, +, #, -, _, .
        slug = re.sub(r'[^\w\+\#\-\.]', '', slug)
        
        # Loại bỏ dấu gạch ngang ở đầu và cuối
        slug = slug.strip('-')
        
        return slug

    custom_slug = create_custom_slug(original_name)
    
    if not custom_slug:
        return Response({'error': 'Invalid tag name after processing.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Kiểm tra xem tag đã tồn tại chưa (theo slug hoặc name)
    existing_tag = Tag.objects.filter(
        Q(slug=custom_slug) | Q(name__iexact=original_name)
    ).first()
    
    if existing_tag:
        serializer = TagSerializer(existing_tag)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # Tạo tag mới
    try:
        tag = Tag.objects.create(
            name=original_name,
            slug=custom_slug
        )
        serializer = TagSerializer(tag)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error creating tag '{original_name}': {e}")
        return Response(
            {'error': 'Failed to create tag. Please try again.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )