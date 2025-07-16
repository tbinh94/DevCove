// UserProfile.jsx - Improved error handling
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, Edit3, Calendar, Clock, Hash, ArrowUp, ArrowDown, UserPlus, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api'; 
import styles from './UserProfile.module.css';

const UserProfile = () => {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch user profile data with improved error handling
  const fetchProfile = async (showLoading = true) => {
    if (!username) {
      setError('Invalid username');
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    
    try {
      console.log(`Fetching profile for user: ${username}`);
      
      // Use the new getUserProfile method with better error handling
      const response = await apiService.getUserProfile(username);
      
      console.log('Profile data received:', response);
      
      if (!response || !response.user) {
        throw new Error('Invalid profile data received');
      }
      
      setProfileData(response);
      setIsFollowing(response.is_following || false);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching profile:', err);
      
      // Set user-friendly error message
      if (err.message.includes('not found') || err.message.includes('404')) {
        setError(`User "${username}" not found`);
      } else if (err.message.includes('500')) {
        setError('Server error. Please try again later.');
      } else if (err.message.includes('Network error')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  // Retry function for failed requests
  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    fetchProfile(true);
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleVote = async (postId, voteType) => {
    if (!isAuthenticated) {
      alert('Please login to vote');
      return;
    }

    try {
      const data = await apiService.vote(postId, voteType);
      
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
    if (!isAuthenticated) {
      alert('Please login to follow users');
      return;
    }
    
    try {
      const data = await apiService.followUser(username);

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
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Unknown time';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <AlertCircle size={48} />
          </div>
          <h2 className={styles.errorTitle}>Oops! Something went wrong</h2>
          <p className={styles.errorMessage}>{error}</p>
          
          {retryCount < 3 && (
            <div className={styles.errorActions}>
              <button 
                onClick={retryFetch} 
                className={styles.retryButton}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}
          
          {retryCount >= 3 && (
            <div className={styles.errorActions}>
              <p className={styles.retryLimitMessage}>
                Multiple attempts failed. Please try again later or contact support.
              </p>
              <Link to="/" className={styles.homeButton}>
                Go to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No profile data
  if (!profileData || !profileData.user) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <AlertCircle size={48} />
          </div>
          <h2 className={styles.errorTitle}>Profile not found</h2>
          <p className={styles.errorMessage}>
            The user "{username}" could not be found.
          </p>
          <Link to="/" className={styles.homeButton}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const { user, profile, posts } = profileData;

  return (
    <div className={styles.profileContainer}>
      <div className={`${styles.profileHeader} ${styles.fadeInUp}`}>
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={`${user.username}'s avatar`}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={styles.defaultAvatar}
              style={profile?.avatar_url ? { display: 'none' } : {}}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <h2>{user.username}</h2>
          
          {profile?.bio && (
            <p className={styles.bio}>{profile.bio}</p>
          )}
          
          <div className={styles.profileStats}>
            <div className={styles.stat}>
              <span className={styles.statNumber}>{posts?.length || 0}</span>
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
          
          {isAuthenticated && currentUser && user.id !== currentUser.id && (
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
          {posts && posts.length > 0 ? (
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
                      <img 
                        src={post.image_url} 
                        alt="Post content"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className={styles.postActions}>
                  <div className={styles.voteSection}>
                    <button 
                      className={`${styles.voteBtn} ${post.user_vote === 'up' ? styles.upvoted : ''}`}
                      onClick={() => handleVote(post.id, 'up')}
                      disabled={!isAuthenticated}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <span className={styles.voteScore}>{post.vote_score || 0}</span>
                    <button 
                      className={`${styles.voteBtn} ${post.user_vote === 'down' ? styles.downvoted : ''}`}
                      onClick={() => handleVote(post.id, 'down')}
                      disabled={!isAuthenticated}
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
              {isAuthenticated && currentUser && user.id === currentUser.id && (
                <Link to="/create-post" className={styles.createFirstPost}>
                  Create your first post
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;