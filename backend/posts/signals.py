from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache
from .models import Comment
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

