from django.core.management.base import BaseCommand
from posts.models import Community

class Command(BaseCommand):
    help = 'Create sample communities'

    def handle(self, *args, **options):
        communities = [
            # Original Tech Communities
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
            'Open Source',

            # --- NEW COMMUNITIES ADDED ---
            # General Interest & Q&A
            'AskReddit',
            'Today I Learned',
            'Explain Like I\'m Five',
            'Life Pro Tips',
            
            # Hobbies & Lifestyle
            'Cooking',
            'Books',
            'Movies',
            'Music',
            'Fitness',
            'Travel',
            'Photography',
            'DIY', # Do It Yourself

            # Entertainment
            'Funny',
            'Memes',
            'Jokes',
            'WholesomeMemes',

            # Knowledge & News
            'Science',
            'History',
            'Space',
            'World News',
            'Personal Finance',

            # Art & Creativity
            'Art',
            'Writing Prompts',
            'Graphic Design'
        ]

        created_count = 0
        self.stdout.write("Starting to create communities...")
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
                f"\nSuccessfully created {created_count} new communities. "
                f"Total communities in DB: {Community.objects.count()}"
            )
        )