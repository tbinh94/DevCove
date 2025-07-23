# ===== 5. ADMIN.PY - Cải thiện admin interface =====

from django.contrib import admin
from .models import Post, Comment, BotSession

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'community', 'created_at', 'is_bot_reviewed', 'bot_reviews_count']
    list_filter = ['created_at', 'community']  # Đã loại bỏ 'is_bot_reviewed' khỏi đây
    search_fields = ['title', 'content', 'author__username']
    readonly_fields = ['is_bot_reviewed', 'bot_reviews_count']
    
    def is_bot_reviewed(self, obj):
        return obj.is_bot_reviewed
    is_bot_reviewed.boolean = True
    is_bot_reviewed.short_description = 'Bot Reviewed'
    
    def bot_reviews_count(self, obj):
        return obj.bot_reviews_count
    bot_reviews_count.short_description = 'Bot Reviews'


@admin.register(BotSession) 
class BotSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'post', 'created_at', 'post_title']
    list_filter = ['created_at']
    search_fields = ['post__title', 'response_text']
    readonly_fields = ['id', 'created_at']
    
    def post_title(self, obj):
        return obj.post.title
    post_title.short_description = 'Post Title'