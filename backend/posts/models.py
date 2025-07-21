from django.urls import reverse
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import models
from django.utils.text import slugify
from django.conf import settings
import uuid
class BotSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(
        'posts.Post', on_delete=models.CASCADE, related_name='bot_sessions'
    )
    request_payload = models.JSONField()
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"BotSession {self.id} for Post {self.post_id}"


class Community(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    owner       = models.ForeignKey(settings.AUTH_USER_MODEL,
                                    on_delete=models.CASCADE,
                                    related_name='owned_communities')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True, blank=True)
    color = models.CharField(max_length=7, default='#007bff')  # Hex color code
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name
    
    def posts_count(self):
        return self.posts.count()
    
    class Meta:
        ordering = ['name']
    
class Post(models.Model):
    title        = models.CharField(max_length=255)
    content      = models.TextField(blank=True)
    image        = models.ImageField(upload_to='post_images/', blank=True, null=True)
    author       = models.ForeignKey(User, on_delete=models.CASCADE)
    community    = models.ForeignKey(Community, on_delete=models.CASCADE,
                                     null=True, blank=True, 
                                     #related_name='posts'
                                     )
    tags         = models.ManyToManyField(Tag, blank=True, related_name='posts')
    created_at   = models.DateTimeField(auto_now_add=True)
    
    def comment_count(self):
        return self.comments.count()  # nếu bạn dùng related_name='comments'

    def __str__(self):
        return self.title
    
    @property
    def score(self):
        """Tính điểm dựa trên vote"""
        upvotes = self.votes.filter(is_upvote=True).count()
        downvotes = self.votes.filter(is_upvote=False).count()
        return upvotes - downvotes
    
    @property
    def comment_count(self):
        """Đếm số comment"""
        return self.comments.count()
    
    def get_user_vote(self, user):
        """Get user's vote on this post"""
        if not user.is_authenticated:
            return None
        try:
            return self.votes.get(user=user)
        except Vote.DoesNotExist:
            return None


class Vote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='votes')
    is_upvote = models.BooleanField()  # True = upvote, False = downvote
    created_at = models.DateTimeField(auto_now_add=True)
    value      = models.SmallIntegerField(editable=False)
    

    class Meta:
        unique_together = ('user', 'post')  # Một user chỉ vote 1 lần cho 1 post
    
    def save(self, *args, **kwargs):
        # tự động set value mỗi lần tạo hoặc update
        self.value = 1 if self.is_upvote else -1
        super().save(*args, **kwargs)

    def __str__(self):
        vote_type = "upvote" if self.is_upvote else "downvote"
        return f"{self.user.username} {vote_type} {self.post.title}"

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    is_bot = models.BooleanField(default=False)
    def __str__(self):
        return f"Comment on {self.post.title}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True)
    
    def followers_count(self):
        return self.user.follower_set.count()
    
    def following_count(self):
        return self.user.following_set.count()

class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following_set', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='follower_set', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('follower', 'following')
    
    def __str__(self):
        return f"{self.follower.username}→{self.following.username}"
    

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('comment', 'Comment'),
        ('vote', 'Vote'),
        ('follow', 'Follow'),
        ('mention', 'Mention'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    post = models.ForeignKey('Post', on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey('Comment', on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.sender.username} -> {self.recipient.username}: {self.get_notification_type_display()}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    
    def get_notification_icon(self):
        """Get icon class for notification type"""
        icons = {
            'comment': 'fas fa-comment',
            'vote': 'fas fa-arrow-up',
            'follow': 'fas fa-user-plus',
            'mention': 'fas fa-at',
        }
        return icons.get(self.notification_type, 'fas fa-bell')
    
    def get_notification_color(self):
        """Get color class for notification type"""
        colors = {
            'comment': 'primary',
            'vote': 'success',
            'follow': 'info',
            'mention': 'warning',
        }
        return colors.get(self.notification_type, 'secondary')
    
    def get_action_url(self):
        """
        Tạo URL động bằng hàm reverse() để đảm bảo luôn chính xác.
        """
        if self.notification_type in ['comment', 'vote'] and self.post:
            # Sửa lỗi chính ở đây: dùng reverse để tạo URL đúng là 'post/<pk>/'
            return reverse('posts:post_detail', kwargs={'pk': self.post.pk})
        
        elif self.notification_type == 'follow':
            # Cũng nên dùng reverse cho các URL khác để đảm bảo tính nhất quán
            return reverse('posts:user_profile', kwargs={'username': self.sender.username})
        
        # URL mặc định nếu không có hành động cụ thể
        return reverse('posts:notifications')