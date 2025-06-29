from django.core.management.base import BaseCommand
from posts.models import Community

class Command(BaseCommand):
    help = 'Create sample communities'

    def handle(self, *args, **options):
        communities = [
            'Python Programming',
            'Django Framework', 
            'Web Development',
            'Data Science',
            'Machine Learning',
            'Frontend Development',
            'Backend Development',
            'DevOps',
            'Mobile Development',
            'General Discussion',
            'Gaming',
            'Technology News',
            'Career Advice',
            'Tutorials',
            'Open Source'
        ]

        created_count = 0
        for name in communities:
            community, created = Community.objects.get_or_create(name=name)
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created community: {name}")
                )
            else:
                self.stdout.write(f"Community already exists: {name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created {created_count} new communities. "
                f"Total: {Community.objects.count()}"
            )
        )