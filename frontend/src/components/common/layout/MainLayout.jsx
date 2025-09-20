// MainLayout.jsx - PHIÊN BẢN CẬP NHẬT ĐIỀU KHIỂN SIDEBAR
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  
  // State này dùng cho việc collapse sidebar trên desktop/tablet
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // --- BƯỚC 1: THÊM STATE ĐỂ QUẢN LÝ SIDEBAR TRÊN MOBILE ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const overviewModalRef = useRef(null);
  const [isChildModalOpen, setIsChildModalOpen] = useState(false);
  
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // --- BƯỚC 2: TẠO CÁC HÀM ĐIỀU KHIỂN SIDEBAR MOBILE ---
  const handleToggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleCloseMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };
  const handleOpenMobileSearch = () => setIsMobileSearchOpen(true);
  const handleCloseMobileSearch = () => setIsMobileSearchOpen(false);
  async function handleGenerateOverview() {
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
  }

  const handlePostsLoaded = useCallback((loadedPosts) => {
    setPosts(loadedPosts);
  }, []);

  // Logic responsive cho sidebar (collapse trên desktop)
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- BƯỚC 3: CẬP NHẬT useEffect DUY NHẤT ĐỂ KHÓA CUỘN ---
  // Giờ nó sẽ khóa cuộn khi sidebar mobile MỞ hoặc overview modal MỞ hoặc modal con MỞ
  useEffect(() => {
    // Nếu có bất kỳ overlay nào đang mở, hãy khóa cuộn
    if (isMobileSidebarOpen || isOverviewModalOpen || isChildModalOpen || isMobileSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function luôn trả về 'auto' để đảm bảo an toàn khi component unmount
    return () => {
      document.body.style.overflow = 'auto';
    };
    // Thêm state mới vào dependencies
  }, [isMobileSidebarOpen, isOverviewModalOpen, isChildModalOpen, isMobileSearchOpen]); 

  const outletContext = useMemo(() => ({
    onPostsLoaded: handlePostsLoaded,
    setBodyScrollLock: setIsChildModalOpen,
  }), [handlePostsLoaded]);

  return (
    <div className={styles.appContainer}>
      {/* --- BƯỚC 4.1: TRUYỀN PROPS XUỐNG CHO HEADER --- */}
      <Header 
        onToggleSidebar={handleToggleMobileSidebar}
        isSidebarOpen={isMobileSidebarOpen}
        // Props mới cho việc điều khiển tìm kiếm
        onOpenMobileSearch={handleOpenMobileSearch}
        onCloseMobileSearch={handleCloseMobileSearch}
        isMobileSearchOpen={isMobileSearchOpen}
      />

      <main className={styles.mainContent}>
        <div className={styles.layoutContainer}>
          {/* --- BƯỚC 4.2: TRUYỀN PROPS XUỐNG CHO SIDEBAR --- */}
          <Sidebar 
            className={styles.sidebarArea}
            user={user}
            posts={posts}
            onGenerateOverview={handleGenerateOverview}
            isOverviewLoading={isOverviewLoading}
            overviewError={overviewError}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            // Props mới cho sidebar mobile
            isOpen={isMobileSidebarOpen}
            onClose={handleCloseMobileSidebar}
          />
          <div className={`${styles.contentArea} ${sidebarCollapsed ? styles.contentExpanded : ''}`}>
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