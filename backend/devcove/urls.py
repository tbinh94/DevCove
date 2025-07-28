from django.conf import settings
from django.contrib import admin
from django.urls import path, include

from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('posts.urls')), # Giữ dòng này để tất cả API đều có /api/
    ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

