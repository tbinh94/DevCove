import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'devcove.settings')
django.setup()

from django.contrib.auth import get_user_model
from posts.models import Profile

User = get_user_model()

# Create admin if not exists
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    Profile.objects.get_or_create(user=user)
    print("Created superuser: admin / admin123")
else:
    print("Admin user already exists")

# Run management commands
from django.core.management import call_command

print("Creating tags...")
call_command('create_tags')

print("Creating communities...")
call_command('create_communities')

print("Generating dummy posts...")
call_command('generate_dummy_posts', count=50, yes=True)

print("Done!")
