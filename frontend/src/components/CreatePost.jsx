import React, { useState, useEffect } from 'react';

const VoteSystem = ({ postId, initialScore = 0, initialUserVote = '', isAuthenticated = false }) => {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isLoading, setIsLoading] = useState(false);

  // Get CSRF token
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Handle vote
  const handleVote = async (voteType) => {
    if (!isAuthenticated) {
      // Show login prompt
      alert('Please login to vote!');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    const csrfToken = getCookie('csrftoken');

    try {
      const response = await fetch('/vote/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          post_id: postId,
          vote_type: voteType,
          csrfmiddlewaretoken: csrfToken
        })
      });

      const data = await response.json();

      if (data.success) {
        setScore(data.score);
        setUserVote(data.action === 'removed' ? '' : voteType);
      } else {
        console.error('Vote error:', data.error);
      }
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vote-section">
      <button
        className={`vote-btn upvote ${userVote === 'up' ? 'active voted-up' : ''}`}
        onClick={() => handleVote('up')}
        disabled={isLoading}
      >
        ↑
      </button>
      
      <span className={`score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`}>
        {score}
      </span>
      
      <button
        className={`vote-btn downvote ${userVote === 'down' ? 'active voted-down' : ''}`}
        onClick={() => handleVote('down')}
        disabled={isLoading}
      >
        ↓
      </button>
    </div>
  );
};
export default VoteSystem;