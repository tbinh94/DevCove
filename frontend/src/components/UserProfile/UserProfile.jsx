// UserProfile.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, Edit3, Calendar, Clock, Hash, ArrowUp, ArrowDown, UserPlus, UserCheck } from 'lucide-react';
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Giả định currentUser được truyền từ context hoặc App state
  const [currentUser] = useState({ id: 1, isAuthenticated: true });

  // Get CSRF token
  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  };

  // Fetch user profile data
  const fetchProfile = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${username}/profile/`);
      
      if (!response.ok) {
        throw new Error(`Could not find user: ${username}`);
      }
      
      const data = await response.json();
      setProfileData(data);
      setIsFollowing(data.is_following);
    } catch (err) {
      setError(err.message || `Could not find user: ${username}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleVote = async (postId, voteType) => {
    if (!currentUser.isAuthenticated) {
      alert('Please login to vote');
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/vote/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote_type: voteType })
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      const data = await response.json();
      
      // Update post data in profileData
      setProfileData(prev => ({
        ...prev,
        posts: prev.posts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                vote_score: data.vote_score,
                user_vote: data.user_vote
              }
            : post
        )
      }));
    } catch (err) {
      console.error('Error voting:', err);
      alert(err.message || "Failed to vote");
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser.isAuthenticated) {
      alert('Please login to follow users');
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${username}/follow/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }

      const data = await response.json();
      setIsFollowing(data.following);
      
      // Update follower count if provided by API
      if (data.follower_count !== undefined) {
        setProfileData(prev => ({
          ...prev,
          user: {
            ...prev.user,
            follower_count: data.follower_count
          }
        }));
      }
    } catch (err) {
      console.error('Error following user:', err);
      alert(err.message || "Failed to update follow status.");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) return <div className={styles.loading}>Loading profile...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!profileData) return <div className={styles.error}>User not found.</div>;

  const { user, profile, posts } = profileData;

  return (
    <div className={styles.profileContainer}>
      <div className={`${styles.profileHeader} ${styles.fadeInUp}`}>
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={`${user.username}'s avatar`} />
            ) : (
              <div className={styles.defaultAvatar}>
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <h2>{user.username}</h2>
          
          {profile?.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}
          
          <div className={styles.profileStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{posts.length}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{user.follower_count || 0}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{user.following_count || 0}</span>
              <span className={styles.statLabel}>Following</span>
            </div>
          </div>
          
          {profile?.joined_date && (
            <div className={styles.joinedDate}>
              <Calendar size={16} />
              <span>Joined {formatTime(profile.joined_date)}</span>
            </div>
          )}
          
          {currentUser.isAuthenticated && user.id !== currentUser.id && (
            <button 
              onClick={handleFollowToggle} 
              className={`${styles.followBtn} ${isFollowing ? styles.unfollow : ''}`}
            >
              {isFollowing ? (
                <>
                  <UserCheck size={16} />
                  Following
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className={styles.postsSection}>
        <div className={styles.postsSectionHeader}>
          <h3>Posts by {user.username}</h3>
        </div>
        <div className={styles.postsList}>
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <div key={post.id} className={`${styles.postCard} ${styles.fadeInUp}`}>
                <div className={styles.postHeader}>
                  <div className={styles.postMeta}>
                    <Link to={`/r/${post.subreddit}`} className={styles.subreddit}>
                      <Hash size={16} />
                      {post.subreddit}
                    </Link>
                    <span className={styles.postTime}>
                      <Clock size={14} />
                      {formatTime(post.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className={styles.postContent}>
                  <Link to={`/post/${post.id}`} className={styles.postTitle}>
                    <h4>{post.title}</h4>
                  </Link>
                  
                  {post.content && (
                    <p className={styles.postText}>{post.content}</p>
                  )}
                  
                  {post.image_url && (
                    <div className={styles.postImage}>
                      <img src={post.image_url} alt="Post content" />
                    </div>
                  )}
                </div>
                
                <div className={styles.postActions}>
                  <div className={styles.voteSection}>
                    <button 
                      className={`${styles.voteBtn} ${post.user_vote === 'up' ? styles.upvoted : ''}`}
                      onClick={() => handleVote(post.id, 'up')}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <span className={styles.voteScore}>{post.vote_score || 0}</span>
                    <button 
                      className={`${styles.voteBtn} ${post.user_vote === 'down' ? styles.downvoted : ''}`}
                      onClick={() => handleVote(post.id, 'down')}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  
                  <Link to={`/post/${post.id}`} className={styles.actionBtn}>
                    <MessageCircle size={16} />
                    <span>{post.comment_count || 0}</span>
                  </Link>
                  
                  <button className={styles.actionBtn}>
                    <Share2 size={16} />
                    Share
                  </button>
                  
                  <button className={styles.actionBtn}>
                    <Bookmark size={16} />
                    Save
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>No posts yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;