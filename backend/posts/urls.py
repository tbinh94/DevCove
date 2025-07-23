from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from . import api_views

# DRF router registrations for API endpoints
router = DefaultRouter()
router.register(r"posts", api_views.PostViewSet, basename="posts")
router.register(r"comments", api_views.CommentViewSet, basename="comments")
router.register(r"tags", api_views.TagViewSet, basename="tags")
router.register(r"users", api_views.UserViewSet, basename="users")
router.register(r"profiles", api_views.ProfileViewSet, basename="profiles")
router.register(r"notifications", api_views.NotificationViewSet, basename="notifications")
router.register(r"communities", api_views.CommunityViewSet, basename="communities")

app_name = 'posts'

# -- API routes grouped under /api/ --
api_urlpatterns = [
    # Authentication (login/register/logout/current-user)
    path('auth/login/',    api_views.login_view,        name='api_login'),
    path('auth/register/', api_views.register_view,     name='api_register'),
    path('auth/logout/',   api_views.logout_view,       name='api_logout'),
    path('auth/user/',     api_views.current_user,      name='api_current_user'),

    # Single CSRF endpoint cho frontend init
    path('csrf/',          api_views.get_csrf_token_view, name='api_csrf'),

    # Unified search
    path('search/',        api_views.search_api,        name='api_search'),

    # Tag utilities
    path('tags/popular/',  api_views.popular_tags,      name='api_popular_tags'),
    path('tags/toggle/',   api_views.toggle_tag_filter, name='api_toggle_tag_filter'),

    path('tags/create/', api_views.create_tag, name='create-tag'),

    path('', include(router.urls)),
]

urlpatterns = [
    # -- Include tất cả API endpoints --
    path('', include((api_urlpatterns, 'api'), namespace='api')), # Thay đổi này để giữ /api/ cho các endpoint của bạn
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)