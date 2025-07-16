# serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from .models import Community, Tag, Post, Vote, Comment, Profile, Follow, Notification
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer cho User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.email = validated_data.get('email', instance.email)
        instance.save()

        # Cập nhật hoặc tạo Profile
        profile, created = Profile.objects.get_or_create(user=instance)
        profile.bio = profile_data.get('bio', profile.bio)
        
        # Xử lý avatar nếu có trong profile_data
        if 'avatar' in profile_data:
            profile.avatar = profile_data.get('avatar', profile.avatar)
        
        profile.save()

        return instance


class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer cơ bản cho User (chỉ hiển thị thông tin cần thiết)"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class CommunitySerializer(serializers.ModelSerializer):
    """Serializer cho Community model"""
    owner = UserBasicSerializer(read_only=True)
    posts_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Community
        fields = ['id', 'name', 'slug', 'description', 'owner', 'created_at', 'posts_count']
        read_only_fields = ['id', 'slug', 'created_at']
    
    def get_posts_count(self, obj):
        return obj.post_set.count()


class CommunityBasicSerializer(serializers.ModelSerializer):
    """Serializer cơ bản cho Community"""
    class Meta:
        model = Community
        fields = ['id', 'name', 'slug']


class TagSerializer(serializers.ModelSerializer):
    """Serializer cho Tag model"""
    posts_count = serializers.SerializerMethodField()  # Sửa: Đổi từ ReadOnlyField thành SerializerMethodField
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'color', 'created_at', 'posts_count']
        read_only_fields = ['id', 'slug', 'created_at']
    
    def get_posts_count(self, obj):
        """Sử dụng method từ model"""
        return obj.posts_count()


class TagBasicSerializer(serializers.ModelSerializer):
    """Serializer cơ bản cho Tag"""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'color']


class VoteSerializer(serializers.ModelSerializer):
    """Serializer cho Vote model"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Vote
        fields = ['id', 'user', 'post', 'is_upvote', 'value', 'created_at']
        read_only_fields = ['id', 'value', 'created_at']


class CommentSerializer(serializers.ModelSerializer):
    """Serializer cho Comment model"""
    author = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'author', 'text', 'created']
        read_only_fields = ['id', 'created']


class PostSerializer(serializers.ModelSerializer):
    """
    Serializer cho Post model (ĐÃ SỬA LỖI)
    - Sửa lỗi không hiển thị ảnh bằng cách tạo image_url đầy đủ.
    - Tối ưu user_vote để trả về dữ liệu đơn giản hơn.
    """
    author = UserBasicSerializer(read_only=True)
    community = CommunityBasicSerializer(read_only=True)
    tags = TagBasicSerializer(many=True, read_only=True)
    
    # Sửa: Sử dụng property từ model
    calculated_score = serializers.IntegerField(source='score', read_only=True)
    comment_count = serializers.SerializerMethodField()  # Sửa: Đổi thành SerializerMethodField
    
    # Thay thế 'image' bằng 'image_url'
    image_url = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 
            'image_url',
            'author', 'community', 'tags', 'created_at', 
            'calculated_score',
            'comment_count', 'user_vote'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, post):
        """
        Tạo URL đầy đủ cho ảnh nếu nó tồn tại.
        """
        request = self.context.get('request')
        if post.image and hasattr(post.image, 'url'):
            return request.build_absolute_uri(post.image.url)
        return None
    
    def get_comment_count(self, post):
        """Sử dụng property từ model"""
        return post.comment_count
    
    def get_user_vote(self, post):
        """
        Tối ưu: Lấy vote của user và trả về 'up', 'down', hoặc null.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = post.votes.filter(user=request.user).first()
            if vote:
                return 'up' if vote.is_upvote else 'down'
        return None


class PostDetailSerializer(PostSerializer):
    """Serializer chi tiết cho Post (bao gồm comments)"""
    comments = CommentSerializer(many=True, read_only=True)
    
    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['comments']


class PostCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer cho việc tạo/cập nhật Post"""
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Post
        fields = ['title', 'content', 'image', 'community', 'tag_ids']
    
    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        post = Post.objects.create(**validated_data)
        
        if tag_ids:
            tags = Tag.objects.filter(id__in=tag_ids)
            post.tags.set(tags)
        
        return post
    
    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if tag_ids is not None:
            tags = Tag.objects.filter(id__in=tag_ids)
            instance.tags.set(tags)
        
        return instance


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer cho Profile model"""
    user = UserBasicSerializer(read_only=True)
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    # Thêm avatar_url để trả về đường dẫn đầy đủ
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'user', 'avatar', 'avatar_url', 'bio', 'followers_count', 'following_count', 'is_following']
        read_only_fields = ['id', 'user']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and hasattr(obj.avatar, 'url'):
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_followers_count(self, obj):
        return obj.user.follower_set.count()
    
    def get_following_count(self, obj):
        return obj.user.following_set.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user.follower_set.filter(follower=request.user).exists()
        return False
    
class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer để cập nhật Profile và thông tin User liên quan."""
    first_name = serializers.CharField(source='user.first_name', max_length=30, required=False)
    last_name = serializers.CharField(source='user.last_name', max_length=150, required=False)
    email = serializers.EmailField(source='user.email', required=False)
    
    class Meta:
        model = Profile
        fields = ['bio', 'avatar', 'first_name', 'last_name', 'email']

    def update(self, instance, validated_data):
        # Lấy dữ liệu của user từ validated_data
        user_data = validated_data.pop('user', {})
        
        # Cập nhật các trường của Profile
        instance.bio = validated_data.get('bio', instance.bio)
        if 'avatar' in validated_data:
             instance.avatar = validated_data.get('avatar', instance.avatar)
        
        instance.save()

        # Cập nhật các trường của User
        user = instance.user
        if user_data:
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.email = user_data.get('email', user.email)
            user.save()

        return instance


class FollowSerializer(serializers.ModelSerializer):
    """Serializer cho Follow model"""
    follower = UserBasicSerializer(read_only=True)
    following = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']  # Sửa: Đổi field names cho đúng
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer cho Notification model"""
    sender = UserBasicSerializer(read_only=True)
    recipient = UserBasicSerializer(read_only=True)
    post = serializers.StringRelatedField(read_only=True)
    comment = serializers.StringRelatedField(read_only=True)
    notification_icon = serializers.SerializerMethodField()  # Sửa: Đổi thành SerializerMethodField
    notification_color = serializers.SerializerMethodField()  # Sửa: Đổi thành SerializerMethodField
    action_url = serializers.SerializerMethodField()  # Sửa: Đổi thành SerializerMethodField
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'notification_type', 'message',
            'post', 'comment', 'is_read', 'created_at', 'read_at',
            'notification_icon', 'notification_color', 'action_url'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def get_notification_icon(self, obj):
        """Sử dụng method từ model"""
        return obj.get_notification_icon()
    
    def get_notification_color(self, obj):
        """Sử dụng method từ model"""
        return obj.get_notification_color()
    
    def get_action_url(self, obj):
        """Sử dụng method từ model"""
        return obj.get_action_url()


# Serializers để thống kê
class CommunityStatsSerializer(serializers.ModelSerializer):
    """Serializer thống kê cho Community"""
    posts_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Community
        fields = ['id', 'name', 'slug', 'posts_count', 'members_count']
    
    def get_posts_count(self, obj):
        return obj.post_set.count()
    
    def get_members_count(self, obj):
        return obj.post_set.values('author').distinct().count()


class UserStatsSerializer(serializers.ModelSerializer):
    """Serializer thống kê cho User"""
    posts_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    total_score = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'posts_count', 'comments_count', 'total_score']
    
    def get_posts_count(self, obj):
        return obj.post_set.count()
    
    def get_comments_count(self, obj):
        return obj.comment_set.count()
    
    def get_total_score(self, obj):
        return sum(post.score for post in obj.post_set.all())


# Serializers cho authentication
class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer cho đăng ký user"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Tự động tạo profile
        Profile.objects.create(user=user)
        
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer cho đổi mật khẩu"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError("New passwords don't match")
        return data
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value