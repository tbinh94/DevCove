# posts/management/commands/populate_comments.py

import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from posts.models import Post, Comment
from faker import Faker

class Command(BaseCommand):
    help = "Populate the database with random demo comments"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', '-n',
            type=int,
            default=100,
            help="Số lượng comment sẽ tạo (mặc định=100)"
        )

    def handle(self, *args, **options):
        fake = Faker()
        users = list(User.objects.all())
        posts = list(Post.objects.all())

        if not users:
            self.stdout.write(self.style.ERROR("Chưa có user nào trong DB. Tạo user trước!"))
            return
        if not posts:
            self.stdout.write(self.style.ERROR("Chưa có post nào trong DB. Tạo ít nhất 1 post!"))
            return

        n = options['count']
        created = 0
        for _ in range(n):
            author = random.choice(users)
            post = random.choice(posts)
            text = fake.sentence(nb_words=random.randint(5, 20))
            Comment.objects.create(
                post=post,
                author=author,
                text=text
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Đã tạo {created} comment demo!"))
