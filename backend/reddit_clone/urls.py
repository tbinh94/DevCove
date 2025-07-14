from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from django.conf.urls.static import static
from posts import views as post_views
from posts.views import logout_view
from django.contrib.auth import views as auth_views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('posts.urls')),
    path('api/', include('posts.urls')),
    path('login/', auth_views.LoginView.as_view(template_name='posts/login.html'), name='login'),
    path('logout/', logout_view, name='logout'),
    path('register/', post_views.register, name='posts/register'),
   
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)