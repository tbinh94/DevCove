from django import forms
from .models import Post, Comment, Profile, Community, Tag
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm

class PostForm(forms.ModelForm):
    tags = forms.CharField(
        max_length=500,
        required=False,
        widget=forms.TextInput(attrs={
            'placeholder': 'Enter tags separated by commas (e.g., python, django, web)',
            'class': 'form-control tag-input'
        }),
        help_text='Enter tags separated by commas. Maximum 5 tags.'
    )
    
    class Meta:
        model = Post
        fields = ['title', 'content', 'image', 'community']
        widgets = {
            'title': forms.TextInput(attrs={
                'placeholder': 'An interesting title...',
                'class': 'form-control'
            }),
            'content': forms.Textarea(attrs={
                'id': 'content',
                'placeholder': 'What are your thoughts?',
                'class': 'form-control',
                'rows': 5
            }),
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            }),
            'community': forms.Select(attrs={
                'class': 'form-control'
            })
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        self.fields['community'].queryset = Community.objects.all()
        self.fields['community'].empty_label = "Choose a community (optional)"
        self.fields['community'].required = False
        
        # Nếu đang edit post, hiển thị tags hiện tại
        if self.instance and self.instance.pk:
            current_tags = self.instance.tags.values_list('name', flat=True)
            self.fields['tags'].initial = ', '.join(current_tags)
    
    def clean_tags(self):
        tags_str = self.cleaned_data.get('tags', '')
        if not tags_str.strip():
            return []
        
        tag_names = []
        for tag in tags_str.split(','):
            tag_name = tag.strip().lower()
            if tag_name and tag_name not in tag_names:
                tag_names.append(tag_name)
        
        if len(tag_names) > 5:
            raise forms.ValidationError('Maximum 5 tags allowed.')
        
        for tag_name in tag_names:
            if len(tag_name) > 30:
                raise forms.ValidationError(f'Tag "{tag_name}" is too long. Maximum 30 characters.')
            if len(tag_name) < 2:
                raise forms.ValidationError(f'Tag "{tag_name}" is too short. Minimum 2 characters.')
        
        return tag_names
    
    def save(self, commit=True):
        """Lưu post và xử lý tags"""
        post = super().save(commit=commit)
        
        if commit:
            # Xử lý tags sau khi post đã được lưu
            tag_names = self.cleaned_data.get('tags', [])
            
            # Xóa all tags cũ
            post.tags.clear()
            
            # Thêm tags mới
            for tag_name in tag_names:
                tag, created = Tag.objects.get_or_create(
                    name=tag_name,
                    defaults={
                        'color': self._get_random_color(),
                    }
                )
                post.tags.add(tag)
        
        return post
    
    def _get_random_color(self):
        """Tạo màu ngẫu nhiên cho tag mới"""
        import random
        colors = [
            '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
            '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d',
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b',
            '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'
        ]
        return random.choice(colors)
    
class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ['text']
        widgets = {
            'text': forms.Textarea(attrs={
                'placeholder': 'What are your thoughts?',
                'class': 'form-control',
                'rows': 3
            })
        }

class SettingsForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']
        widgets = {
            'first_name': forms.TextInput(attrs={'placeholder': 'First name'}),
            'last_name': forms.TextInput(attrs={'placeholder': 'Last name'}),
            'email': forms.EmailInput(attrs={'placeholder': 'Email'}),
        }

class ProfileForm(forms.ModelForm):
    class Meta:
        model  = Profile
        fields = ['avatar', 'bio']

class TagForm(forms.ModelForm):
    class Meta:
        model = Tag
        fields = ['name', 'color']
        widgets = {
            'name': forms.TextInput(attrs={
                'placeholder': 'Tag name',
                'class': 'form-control'
            }),
            'color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'form-control'
            })
        }
    
    def clean_name(self):
        name = self.cleaned_data.get('name', '').strip().lower()
        if len(name) < 2:
            raise forms.ValidationError('Tag name must be at least 2 characters.')
        if len(name) > 30:
            raise forms.ValidationError('Tag name cannot exceed 30 characters.')
        return name