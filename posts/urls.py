from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, reverse_lazy

app_name = 'posts'
urlpatterns = [
    path('', views.post_list, name='post_list'),
    path('create/', views.create_post, name='create_post'),
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    path('vote/', views.vote_post, name='vote'),
    path('register/', views.register, name='register'),

    path('settings/', views.settings_view, name='user_settings'),
    path(
        'profile/<int:pk>/',
        views.profile_view,
        name='user_profile'    
    ),
    path('profile/edit/', views.profile_edit, name='profile_edit'),
    
    path(
        'password-change/',
        views.password_change_view,    # <-- dùng custom view
        name='password_change'
    ),
    # Tìm kiếm user
    path('users/search/', views.user_search, name='user_search'),
    # Xem profile (có follow/unfollow)
    path('users/<str:username>/', views.user_profile_view, name='user_profile'),
    # Follow / Unfollow
    path('users/<str:username>/follow/', views.follow_toggle, name='follow_toggle'),
    path('r/<slug:slug>/', views.community_view, name='community'),
    path('tags/', views.all_tags, name='all_tags'), 
    # Chỉnh sửa post
    path('post/<int:pk>/edit/', views.edit_post, name='edit_post'),
    # (nếu cần) Xóa post
    path('post/<int:pk>/delete/', views.delete_post, name='delete_post'),
    path(
        'tags/<slug:slug>/',
        views.tag_detail,
        name='tag_detail'
    ),
    path('communities/', views.community_list, name='community_list'),
    path('communities/create/', views.community_create, name='community_create'),
    path('c/<slug:slug>/', views.community_detail, name='community_detail'),
    path('c/<slug:slug>/edit/', views.community_update, name='community_update'),
    path('c/<slug:slug>/delete/', views.community_delete, name='community_delete'),
    path('toggle-tag-filter/', views.toggle_tag_filter, name='toggle_tag_filter'),  # NEW
    # URL cho trang xem tất cả notifications
    path('notifications/', views.notifications_view, name='notifications'),

    # API endpoints cho JavaScript
    path('notifications/count/', views.get_unread_notifications_count, name='get_unread_notifications_count'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark_notification_read'),
   

]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
