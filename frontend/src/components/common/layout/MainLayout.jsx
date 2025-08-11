// MainLayout.jsx - PHIÊN BẢN SỬA LỖI VÒNG LẶP
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // <-- Thêm useCallback, useMemo
import { Outlet } from 'react-router-dom';
import { Header, Footer, Sidebar } from './index';
import styles from './MainLayout.module.css';
import { useAuth } from '../../../contexts/AuthContext';
import apiService from '../../../services/api';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';

const MainLayout = () => {
  const { isAuthenticated, user } = useAuth();

  const [posts, setPosts] = useState([]);
  
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const overviewModalRef = useRef(null);

  const handleGenerateOverview = async () => {
    if (!isAuthenticated || posts.length === 0) {
      if (!isAuthenticated) alert("Bạn cần đăng nhập để dùng tính năng này.");
      return;
    }

    setIsOverviewLoading(true);
    setOverviewError(null);
    setOverview(null);

    try {
      const postIds = posts.map(p => p.id);
      const response = await apiService.generatePostListOverview({ post_ids: postIds });
      
      setOverview(response.overview);
      setIsOverviewModalOpen(true);
    } catch (err) {
      console.error('Error generating overview:', err);
      const errorMessage = err.response?.data?.error || 'Không thể tạo tổng quan. Vui lòng thử lại.';
      setOverviewError(errorMessage);
    } finally {
      setIsOverviewLoading(false);
    }
  };

  // SỬA LỖI 1: BỌC HÀM BẰNG `useCallback`
  // Hàm này giờ sẽ không bị tạo lại sau mỗi lần re-render, trừ khi phụ thuộc thay đổi.
  // Ở đây, mảng phụ thuộc là rỗng `[]` vì `setPosts` được React đảm bảo là ổn định.
  const handlePostsLoaded = useCallback((loadedPosts) => {
    setPosts(loadedPosts);
  }, []); // <-- Mảng phụ thuộc rỗng

  // Logic responsive cho sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cuộn tới modal khi nó mở
  useEffect(() => {
    if (isOverviewModalOpen && overviewModalRef.current) {
        setTimeout(() => {
            overviewModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
  }, [isOverviewModalOpen]);

  // SỬA LỖI 2: BỌC OBJECT CONTEXT BẰNG `useMemo`
  // Điều này đảm bảo rằng object context chỉ được tạo lại khi `handlePostsLoaded` thay đổi.
  // Vì `handlePostsLoaded` giờ đã ổn định, object này cũng sẽ ổn định.
  const outletContext = useMemo(() => ({
    onPostsLoaded: handlePostsLoaded,
  }), [handlePostsLoaded]);


  return (
    <div className={styles.appContainer}>
      <Header />
      <main className={styles.mainContent}>
        <div className={styles.layoutContainer}>
          <Sidebar 
            user={user}
            posts={posts}
            onGenerateOverview={handleGenerateOverview}
            isOverviewLoading={isOverviewLoading}
            overviewError={overviewError}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div className={`${styles.contentArea} ${sidebarCollapsed ? styles.contentExpanded : ''}`}>
            {/* Truyền object context đã được ổn định xuống */}
            <Outlet context={outletContext} />
          </div>
        </div>
      </main>
      <Footer />

       {isOverviewModalOpen && (
        <div ref={overviewModalRef} className={styles.overviewModalOverlay}>
          <div className={styles.overviewModal}>
            <div className={styles.overviewModalHeader}>
              <h3>📊 DevAlly Overview</h3>
              <button onClick={() => setIsOverviewModalOpen(false)} className={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            <div 
              className={styles.overviewModalContent} 
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(overview) }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;