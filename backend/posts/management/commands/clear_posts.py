import sys
from django.core.management.base import BaseCommand
from posts.models import Post

class Command(BaseCommand):
    help = 'Xóa toàn bộ bài viết trong hệ thống.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes', '-y',
            action='store_true',
            help='Bỏ qua bước xác nhận và xóa ngay lập tức.'
        )

    def handle(self, *args, **options):
        # Đếm số bài viết hiện tại
        total = Post.objects.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('Không có bài viết nào để xóa.'))
            return

        # Xác nhận từ người dùng
        if not options['yes']:
            confirm = input(f"Bạn có chắc muốn xóa toàn bộ {total} bài viết không? [y/N]: ")
            if confirm.lower() != 'y':
                self.stdout.write(self.style.ERROR('Hủy bỏ thao tác.'))
                sys.exit(1)

        # Thực hiện xóa
        deleted, _ = Post.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Đã xóa {deleted} mục (bài viết + liên quan) thành công.'))
