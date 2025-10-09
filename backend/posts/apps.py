from django.apps import AppConfig
from django.core.management import call_command
from django.db.models.signals import post_migrate
import sys
import os


def run_update_helpers(sender, **kwargs):
    try:
        call_command('update_helpers')
        print("✅ Weekly helpers updated after migrations!")
    except Exception as e:
        print(f"❌ Error updating helpers: {e}")


class PostsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'posts'

    def ready(self):
        print(f"🔍 DEBUG: ready() called")
        print(f"🔍 DEBUG: sys.argv = {sys.argv}")
        print(f"🔍 DEBUG: RUN_MAIN = {os.environ.get('RUN_MAIN')}")

        if os.environ.get('RUN_MAIN') == 'true':
            post_migrate.connect(run_update_helpers, sender=self)
            print("🔁 post_migrate signal connected!")
        else:
            print("🔍 DEBUG: In reloader process, skipping...")
