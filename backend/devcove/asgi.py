# project_name/asgi.py

import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

# Đảm bảo import routing của app bạn
import posts.routing 

# Đặt biến môi trường cho settings của Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'devcove.settings') 

# ===>> THAY ĐỔI QUAN TRỌNG <<===
# Gọi django.setup() để đảm bảo tất cả các model và ứng dụng của Django
# được tải và sẵn sàng trước khi import các thành phần khác.
django.setup() 

# Bây giờ mới lấy ứng dụng HTTP
http_application = get_asgi_application()

application = ProtocolTypeRouter({
    "http": http_application,
    "websocket": AuthMiddlewareStack( # AuthMiddlewareStack bọc ngoài cùng
        URLRouter(
            posts.routing.websocket_urlpatterns # Danh sách các URL WebSocket của bạn
        )
    ),
})