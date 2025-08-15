# posts/urls.py - PHIÊN BẢN ĐÃ SỬA VÀ ĐƠN GIẢN HÓA

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views
from .api_views import ai_refactor_code_view, ai_generate_title_view, AIChallengeGeneratorView, WeeklyChallengeViewSet # Import hàm get_ai_response từ api_views
# Khởi tạo router
router = DefaultRouter()
router.register(r"posts", api_views.PostViewSet, basename="posts")
router.register(r"comments", api_views.CommentViewSet, basename="comments")
router.register(r"tags", api_views.TagViewSet, basename="tags")
router.register(r"users", api_views.UserViewSet, basename="users") # Dòng này sẽ tạo /users/ và /users/chat-candidates/
router.register(r"profiles", api_views.ProfileViewSet, basename="profiles")
router.register(r"notifications", api_views.NotificationViewSet, basename="notifications")
router.register(r"communities", api_views.CommunityViewSet, basename="communities")
router.register(r'conversations', api_views.ConversationViewSet, basename='conversation')
router.register(r'challenges', WeeklyChallengeViewSet, basename='challenge') 

app_name = 'posts'

# urlpatterns chính cho app này. Tất cả các URL đều được định nghĩa ở đây.
urlpatterns = [
    # Authentication (login/register/logout/current-user)
    path('auth/login/',    api_views.login_view,        name='api_login'),
    path('auth/register/', api_views.register_view,     name='api_register'),
    path('auth/logout/',   api_views.logout_view,       name='api_logout'),
    path('auth/user/',     api_views.current_user,      name='api_current_user'),

    # CSRF endpoint
    path('csrf/',          api_views.get_csrf_token_view, name='api_csrf'),

    # Search endpoint
    path('search/',        api_views.search_api,        name='api_search'),

    # Tag utilities
    path('tags/popular/',  api_views.popular_tags,      name='api_popular_tags'),
    path('tags/toggle/',   api_views.toggle_tag_filter, name='api_toggle_tag_filter'),
    path('tags/create/', api_views.create_tag, name='create-tag'),
    
    path('ai/refactor-code/', ai_refactor_code_view, name='ai_refactor_code'),
    path('ai/generate-title/', ai_generate_title_view, name='ai_generate_title'),
    path('ai/generate-challenge/', AIChallengeGeneratorView.as_view(), name='ai_generate_challenge'),

    path('bugs/log/', api_views.log_bug_view, name='log_bug'),
    path('bugs/stats/', api_views.bug_stats_view, name='bug_stats'),
    path('bugs/reviews/', api_views.bug_reviews_view, name='bug_reviews'),
    # Include tất cả các URL do router tạo ra vào cuối danh sách này
    path('', include(router.urls)),
]