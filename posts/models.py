from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import models
from django.utils.text import slugify


class Community(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

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
    community    = models.ForeignKey(Community, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='posts')
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