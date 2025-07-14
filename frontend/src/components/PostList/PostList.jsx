// PostList.jsx - Thử cách giống notification
import React, { useState, useEffect } from 'react';

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get CSRF token (giống notification)
  const getCSRFToken = () => {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  };

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Dùng fetch trực tiếp như notification
        const response = await fetch('/api/posts/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setPosts(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Voting function với fetch trực tiếp
  const handleVote = async (postId, voteType) => {
    try {
      const response = await fetch(`/api/posts/${postId}/vote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({ vote_type: voteType }),
      });

      if (!response.ok) {
        throw new Error('Vote failed');
      }

      const data = await response.json();
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { 
                ...post, 
                calculated_score: data.score, 
                user_vote: data.action === 'removed' ? null : voteType 
              }
            : post
        )
      );
    } catch (err) {
      alert(err.message || "You must be logged in to vote.");
    }
  };

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <p>Score: {post.calculated_score}</p>
          <button onClick={() => handleVote(post.id, 'up')}>Upvote</button>
          <button onClick={() => handleVote(post.id, 'down')}>Downvote</button>
        </div>
      ))}
    </div>
  );
};

export default PostList;