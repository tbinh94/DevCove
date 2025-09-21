from django.apps import AppConfig
from django.core.management import call_command
import sys
import os

class PostsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'posts'
    
    def ready(self):
        # Debug info
        print(f"🔍 DEBUG: ready() called")
        print(f"🔍 DEBUG: sys.argv = {sys.argv}")
        print(f"🔍 DEBUG: RUN_MAIN = {os.environ.get('RUN_MAIN')}")
        
        if os.environ.get('RUN_MAIN') == 'true':
            try:
                call_command('update_helpers')
                print("✅ Weekly helpers updated on server start!")
            except Exception as e:
                print(f"❌ Error updating helpers: {e}")
        else:
            print("🔍 DEBUG: In reloader process, skipping...")