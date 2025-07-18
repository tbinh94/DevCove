# backend/posts/management/commands/create_tags.py

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from posts.models import Tag

class Command(BaseCommand):
    help = 'Create programming language tags in the database'

    def handle(self, *args, **options):
        tag_names = [
            'html', 'css', 'javascript', 'python', 'java',
            'c', 'c++', 'c#', 'go', 'ruby',
            'php', 'sql', 'swift', 'kotlin', 'typescript',
            'rust', 'scala'
        ]

        created_count = 0
        for name in tag_names:
            slug = slugify(name)
            tag, created = Tag.objects.get_or_create(
                slug=slug,
                defaults={'name': name}
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"✅ Created tag: {name} (slug={slug})"))
            else:
                self.stdout.write(f"– Tag already exists: {name} (slug={slug})")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {created_count} new tags created, total tags: {Tag.objects.count()}"
        ))
