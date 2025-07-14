// MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header, Footer, Sidebar } from './index';
import styles from './MainLayout.module.css';

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
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
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
        setError('Failed to load popular tags');
        // Set empty array as fallback
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

  // Loading state with improved UI
  if (loading) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content">
          <div className="container">
            <div className={styles.layoutContainer}>
              <div className={styles.contentContainer}>
                <div className="loading-container" style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '200px',
                  flexDirection: 'column'
                }}>
                  <div className="spinner" style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #ff4500',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                  }}></div>
                  <p style={{ color: '#666', fontSize: '14px' }}>Loading popular tags...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state with improved UI
  if (error) {
    return (
      <div className="app-container">
        <Header />
        <main className="main-content">
          <div className="container">
            <div className={styles.layoutContainer}>
              <div className={styles.contentContainer}>
                <div className="error-container" style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  minHeight: '200px',
                  flexDirection: 'column',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '48px', 
                    marginBottom: '16px',
                    color: '#ff4500'
                  }}>⚠️</div>
                  <h3 style={{ 
                    color: '#333', 
                    marginBottom: '8px',
                    fontSize: '18px'
                  }}>Oops! Something went wrong</h3>
                  <p style={{ 
                    color: '#666', 
                    fontSize: '14px',
                    marginBottom: '16px'
                  }}>{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#ff4500',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <div className="container">
          <div className={styles.layoutContainer}>
            <Sidebar 
              popularTags={popularTags} 
              onTagToggle={handleTagToggle}
              formatTimeAgo={formatTimeAgo}
            />
            <div className={styles.contentContainer}>
              <Outlet context={{ 
                popularTags, 
                formatTimeAgo, 
                getCSRFToken 
              }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;