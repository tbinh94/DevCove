from django import template
from django.utils.timesince import timesince

register = template.Library()

@register.filter
def is_bot_reviewed(post):
    """Check if post has bot reviews"""
    return post.is_bot_reviewed

@register.filter
def bot_review_badge(post):
    """Generate bot review badge HTML"""
    if post.is_bot_reviewed:
        count = post.bot_reviews_count
        latest_date = post.latest_bot_review.created if post.latest_bot_review else None
        time_ago = timesince(latest_date) if latest_date else 'Unknown'
        
        return f'''
        <span class="badge badge-success" title="Bot reviewed {time_ago} ago">
            🤖 Reviewed ({count})
        </span>
        '''
    return ''

@register.inclusion_tag('posts/bot_review_indicator.html')
def bot_review_indicator(post):
    """Template tag for bot review indicator"""
    return {
        'post': post,
        'is_reviewed': post.is_bot_reviewed,
        'review_count': post.bot_reviews_count,
        'latest_review': post.latest_bot_review
    }