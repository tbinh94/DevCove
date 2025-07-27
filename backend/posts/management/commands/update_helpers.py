from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import F, Count
from datetime import timedelta
from posts.models import Comment, Profile, User

class Command(BaseCommand):
    help = 'Update weekly helper status for all users'

    def handle(self, *args, **options):
        one_week_ago = timezone.now() - timedelta(days=7)
        
        # Reset all to False
        Profile.objects.update(is_weekly_helper=False)
        
        # Find helper candidates
        helper_candidates = Comment.objects.filter(
            created__gte=one_week_ago,
            is_bot=False
        ).exclude(
            post__author=F('author')
        ).values('author').annotate(
            commented_posts_count=Count('post', distinct=True)
        ).filter(
            commented_posts_count__gte=5
        )
        
        helper_user_ids = [item['author'] for item in helper_candidates]
        
        # Ensure profiles exist
        for user_id in helper_user_ids:
            try:
                user = User.objects.get(id=user_id)
                Profile.objects.get_or_create(user=user)
            except User.DoesNotExist:
                continue
        
        # Update
        updated_count = Profile.objects.filter(
            user_id__in=helper_user_ids
        ).update(is_weekly_helper=True)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully updated {updated_count} weekly helpers'
            )
        )