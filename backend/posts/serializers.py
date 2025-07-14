# serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Community, Tag, Post, Vote, Comment, Profile, Follow, Notification


class UserSerializer(serializers.ModelSerializer):
    """Serializer cho User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


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
    posts_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'color', 'created_at', 'posts_count']
        read_only_fields = ['id', 'slug', 'created_at']


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
        fields = ['id', 'post', 'author', 'text', 'created'] # Đã sửa từ 'created_at' thành 'created'
        read_only_fields = ['id', 'created'] # Đã sửa từ 'created_at' thành 'created'


class PostSerializer(serializers.ModelSerializer):
    """
    Serializer cho Post model (ĐÃ SỬA LỖI)
    - Sửa lỗi không hiển thị ảnh bằng cách tạo image_url đầy đủ.
    - Tối ưu user_vote để trả về dữ liệu đơn giản hơn.
    """
    author = UserBasicSerializer(read_only=True)
    community = CommunityBasicSerializer(read_only=True)
    tags = TagBasicSerializer(many=True, read_only=True)
    
    # Sửa: Sử dụng ReadOnlyField để lấy giá trị từ model property/annotation
    calculated_score = serializers.IntegerField(source='score', read_only=True)
    comment_count = serializers.IntegerField(read_only=True) # Giả sử bạn đã annotate ở view
    
    # 1. Thay thế 'image' bằng 'image_url'
    image_url = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 
            'image_url',  # Đã thay 'image' bằng 'image_url'
            'author', 'community', 'tags', 'created_at', 
            'calculated_score', # Đã sửa 'score' thành 'calculated_score' để khớp với view
            'comment_count', 'user_vote'
        ]
        read_only_fields = ['id', 'created_at']
    
    # 2. Thêm phương thức để tạo URL tuyệt đối cho ảnh
    def get_image_url(self, post):
        """
        Tạo URL đầy đủ cho ảnh nếu nó tồn tại.
        """
        request = self.context.get('request')
        if post.image and hasattr(post.image, 'url'):
            # build_absolute_uri sẽ tạo ra http://localhost:8000/media/post_images/...
            return request.build_absolute_uri(post.image.url)
        return None # Trả về null nếu không có ảnh

    def get_user_vote(self, post):
        """
        Tối ưu: Lấy vote của user và trả về 'up', 'down', hoặc null.
        Dữ liệu trả về đơn giản, nhẹ và dễ xử lý ở frontend.
        """
        user = self.context.get('request').user
        if user.is_authenticated:
            # Dùng filter().first() để tránh lỗi khi không tìm thấy
            vote = post.votes.filter(user=user).first()
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
    followers_count = serializers.ReadOnlyField()
    following_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Profile
        fields = ['id', 'user', 'avatar', 'bio', 'followers_count', 'following_count']
        read_only_fields = ['id']


class FollowSerializer(serializers.ModelSerializer):
    """Serializer cho Follow model"""
    follower = UserBasicSerializer(read_only=True)
    following = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer cho Notification model"""
    sender = UserBasicSerializer(read_only=True)
    recipient = UserBasicSerializer(read_only=True)
    post = serializers.StringRelatedField(read_only=True)
    comment = serializers.StringRelatedField(read_only=True)
    notification_icon = serializers.ReadOnlyField(source='get_notification_icon')
    notification_color = serializers.ReadOnlyField(source='get_notification_color')
    action_url = serializers.ReadOnlyField(source='get_action_url')
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'sender', 'notification_type', 'message',
            'post', 'comment', 'is_read', 'created_at', 'read_at',
            'notification_icon', 'notification_color', 'action_url'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


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
        # Giả sử bạn có relationship members trong Community model
        # Nếu không có, có thể đếm số user unique đã post trong community
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