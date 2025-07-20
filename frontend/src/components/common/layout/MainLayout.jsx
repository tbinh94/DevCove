// MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Footer, Sidebar } from './index';
import styles from './MainLayout.module.css'; // Now using the new CSS module

// Utility function to get CSRF token
const getCSRFToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]');
  return token ? token.getAttribute('content') : '';
};

// Utility function to format time ago
const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
};

const MainLayout = () => {
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/tags/popular', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setPopularTags(data.tags || data || []);
      } catch (err) {
        console.error('Failed to fetch popular tags:', err);
        setError('Failed to load popular tags. Please try again later.');
        setPopularTags([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTags();
  }, []);

  const handleTagToggle = async (tagSlug) => {
    try {
      console.log("Tag toggled:", tagSlug);
      // Optional: Send tag interaction to server for analytics
      await fetch('/api/tags/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken(),
        },
        body: JSON.stringify({ 
          tagSlug,
          action: 'toggle',
          timestamp: new Date().toISOString()
        }),
      });
    } catch (err) {
      console.error('Failed to record tag interaction:', err);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading popular tags...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3 className={styles.errorTitle}>Oops! Something went wrong</h3>
          <p className={styles.errorMessage}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <Outlet context={{ popularTags, formatTimeAgo, getCSRFToken }} />
    );
  }

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <div className={styles.mainContainer}>
          <Sidebar 
            popularTags={popularTags} 
            onTagToggle={handleTagToggle}
            formatTimeAgo={formatTimeAgo}
            loading={loading} // Pass loading state to sidebar
            error={!!error}   // Pass error state to sidebar
          />
          <div className={styles.contentArea}>
            {renderContent()}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;