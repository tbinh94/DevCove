import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from faker import Faker
from posts.models import Post

class Command(BaseCommand):
    help = "Populate the database with random demo posts"

    def add_arguments(self, parser):
        parser.add_argument(
            '--count', '-n',
            type=int,
            default=20,
            help="Số lượng bài sẽ tạo (mặc định=20)"
        )

    def handle(self, *args, **options):
        fake = Faker()
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR("Chưa có user nào trong DB. Tạo user trước!"))
            return

        n = options['count']
        created = 0
        for _ in range(n):
            # Chọn random user
            author = random.choice(users)
            title = fake.sentence(nb_words=6)
            # 50% posts có ảnh, lấy từ các URL sample
            image = None
            if random.random() < 0.5:
                # Ví dụ dùng ảnh placeholder
                image_url = f"https://picsum.photos/seed/{random.randint(1,1000)}/400/300"
                image = image_url

            post = Post.objects.create(
                title=title,
                author=author,
                score=random.randint(0,50),
                # content nếu có
            )
            # Nếu Post.image là ImageField, bạn cần download ảnh hoặc bỏ qua
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Đã tạo {created} post demo!"))
