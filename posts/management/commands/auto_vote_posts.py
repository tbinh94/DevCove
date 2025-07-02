import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import IntegrityError
from posts.models import Post, Vote

class Command(BaseCommand):
    help = "Auto upvote/downvote existing posts for demo using Vote model"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', '-n',
            type=int, default=100,
            help="Tổng số lượt vote sẽ tạo (mặc định=100)"
        )
        parser.add_argument(
            '--direction', '-d',
            choices=['up', 'down', 'random'],
            default='random',
            help="Hướng vote: 'up', 'down' hay 'random' (mặc định)"
        )

    def handle(self, *args, **options):
        n = options['count']
        direction = options['direction']
        users = list(User.objects.all())
        posts = list(Post.objects.all())

        if not users:
            self.stdout.write(self.style.ERROR("Chưa có user nào trong DB."))
            return
        if not posts:
            self.stdout.write(self.style.ERROR("Chưa có post nào trong DB."))
            return

        created = 0
        for _ in range(n):
            user = random.choice(users)
            post = random.choice(posts)

            # Chọn hướng vote
            if direction == 'random':
                is_up = random.choice([True, False])
            else:
                is_up = (direction == 'up')

            try:
                # Nếu user đã vote trước đó, update lại
                vote_obj, did_create = Vote.objects.update_or_create(
                    user=user, post=post,
                    defaults={'is_upvote': is_up}
                )
                created += 1
            except IntegrityError:
                # unique_together lỗi
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f"Đã tạo/cập nhật {created} lượt vote (direction={direction})!"
            )
        )
