from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from .models import Comment, Profile, User
import logging
logger = logging.getLogger(__name__)
@receiver(post_save, sender=Comment)
def invalidate_post_cache_on_bot_comment(sender, instance, created, **kwargs):
    """
    Invalidate cache khi có bot comment mới
    """
    if instance.is_bot and created:
        # Xóa cache liên quan đến post này
        cache_keys = [
            f'post_bot_reviewed_{instance.post.id}',
            f'post_detail_{instance.post.id}',
            'bot_reviewed_posts_list'
        ]
        cache.delete_many(cache_keys)
        
        # Log bot review activity
        logger.info(f'New bot review added for post {instance.post.id}')

@receiver(post_save, sender=Comment)
def cached_helper_update(sender, instance, created, **kwargs):
    """
    Version với caching để tránh tính toán liên tục
    """
    if not created or instance.is_bot:
        return
    
    user = instance.author
    cache_key = f"helper_status_update_{user.id}"
    
    # Kiểm tra cache - chỉ update mỗi 10 phút
    if cache.get(cache_key):
        return
    
    try:
        profile, _ = Profile.objects.get_or_create(user=user)
        one_week_ago = timezone.now() - timedelta(days=7)
        
        commented_posts_count = Comment.objects.filter(
            author=user,
            created__gte=one_week_ago,
            is_bot=False
        ).exclude(
            post__author=user
        ).values('post').distinct().count()
        
        new_status = commented_posts_count >= 5
        
        if profile.is_weekly_helper != new_status:
            profile.is_weekly_helper = new_status
            profile.save(update_fields=['is_weekly_helper'])
        
        # Cache 10 phút
        cache.set(cache_key, True, 600)
        
    except Exception as e:
        logger.error(f"Error in cached helper update: {e}")