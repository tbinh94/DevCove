from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from . import views, api_views

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

    # Tất cả các ViewSet đã đăng ký
    path('', include(router.urls)),
]

urlpatterns = [
    # --- Template views (Django) ---
    path('',                  views.post_list,                   name='post_list'),
    path('create/',           views.create_post,                 name='create_post'),
    path('post/<int:pk>/',    views.post_detail,                 name='post_detail'),
    path('post/<int:pk>/edit/',   views.edit_post,              name='edit_post'),
    path('post/<int:pk>/delete/', views.delete_post,            name='delete_post'),
    #path('vote/',             views.vote_post,                   name='vote'),

    # Auth templates
    path('register/',         views.register,                    name='register'),
    path('settings/',         views.settings_view,               name='user_settings'),
    path('password-change/',  views.password_change_view,        name='password_change'),

    # User profiles
    #path('profile/<int:pk>/',      views.profile_view,          name='user_profile'), 
    path('profile/edit/',          views.profile_edit,          name='profile_edit'),
    #path('users/<str:username>/',  views.user_profile_view,     name='user_profile'), 
    #path('users/<str:username>/follow/', views.follow_toggle,    name='follow_toggle'), 

    # Communities
    path('communities/',            views.community_list,      name='community_list'),
    path('communities/create/',     views.community_create,    name='community_create'),
    path('r/<slug:slug>/',          views.community_view,      name='community'),
    path('c/<slug:slug>/',          views.community_detail,    name='community_detail'),
    path('c/<slug:slug>/edit/',     views.community_update,    name='community_update'),
    path('c/<slug:slug>/delete/',   views.community_delete,    name='community_delete'),

    # Tags (template)
    path('tags/',           views.all_tags,          name='all_tags'),
    path('tags/<slug:slug>/', views.tag_detail,      name='tag_detail'),
    path('toggle-tag-filter/', views.toggle_tag_filter, name='toggle_tag_filter'),

    # Notifications (template)
    path('notifications/',              views.notifications_view,           name='notifications'),
    path('notifications/count/',        views.get_unread_notifications_count, name='get_unread_notifications_count'),
    path('notifications/mark-all-read/',views.mark_all_notifications_read,   name='mark_all_notifications_read'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),

    # -- Include tất cả API endpoints --
    path('api/', include((api_urlpatterns, 'api'), namespace='api')),
    
]

# Static media
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)