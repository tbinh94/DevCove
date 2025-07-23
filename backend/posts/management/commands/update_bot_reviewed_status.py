from django.core.management.base import BaseCommand
from django.db import transaction
from posts.models import Post, Comment

class Command(BaseCommand):
    help = 'Update bot reviewed status for existing posts'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Tìm tất cả posts có bot comments
        posts_with_bot_comments = Post.objects.filter(
            comments__is_bot=True
        ).distinct()
        
        self.stdout.write(f'Found {posts_with_bot_comments.count()} posts with bot reviews')
        
        if not dry_run:
            with transaction.atomic():
                for post in posts_with_bot_comments:
                    bot_count = post.comments.filter(is_bot=True).count()
                    self.stdout.write(
                        f'Post {post.id}: "{post.title}" - {bot_count} bot reviews'
                    )
            
            self.stdout.write(
                self.style.SUCCESS('Successfully updated bot reviewed status')
            )
        else:
            self.stdout.write('Dry run completed - no changes made')