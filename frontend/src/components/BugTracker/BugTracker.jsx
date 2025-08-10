import React, { useState, useEffect } from 'react';
// ✅ SỬ DỤNG API SERVICE THẬT
import apiService from '../../services/api';
// Import CSS module
import styles from './BugTracker.module.css';

const Heatmap = ({ data, period }) => {
    // 1. TẠO KHUNG HEATMAP HOÀN CHỈNH
    const today = new Date();
    let heatmapFramework = [];

    if (period === 'weekly') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            heatmapFramework.push({
                // Định dạng ngày thành 'YYYY-MM-DD' để khớp với backend
                fullDate: date.toISOString().split('T')[0], 
                day: date.toLocaleDateString('en-US', { weekday: 'short' }), // 'Mon', 'Tue', ...
                errors: 0 // Mặc định là 0 lỗi
            });
        }
    } else { // 'monthly'
        for (let i = 3; i >= 0; i--) {
            const weekStartDate = new Date();
            weekStartDate.setDate(today.getDate() - (i * 7));
            heatmapFramework.push({
                // Tạo một key định danh cho tuần
                weekKey: `Week${4-i}`,
                day: `Week ${4-i}`,
                errors: 0
            });
        }
    }
    
    // 2. ĐIỀN DỮ LIỆU TỪ API VÀO KHUNG
    if (period === 'weekly') {
        const apiDataMap = new Map(data.map(item => [item.day.split('T')[0], item.errors]));
        heatmapFramework.forEach(cell => {
            if (apiDataMap.has(cell.fullDate)) {
                cell.errors = apiDataMap.get(cell.fullDate);
            }
        });
    } else { // 'monthly'
        // Logic điền dữ liệu cho tháng có thể phức tạp hơn,
        // ở đây ta giả định backend đã tổng hợp sẵn theo tuần.
        data.forEach((item, index) => {
            if (heatmapFramework[index]) {
                heatmapFramework[index].errors = item.errors;
            }
        });
    }

    // 3. LOGIC RENDER
    const maxErrors = Math.max(...heatmapFramework.map(d => d.errors), 1); // Đảm bảo không chia cho 0
    const getColor = (value) => {
        const intensity = value / maxErrors;
        // Blue scale: từ dark blue to bright cyan
        const r = 15;
        const g = Math.floor(80 + 120 * intensity);
        const b = Math.floor(180 + 75 * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    };

    return (
        <div className={styles.heatmapGrid}>
            {heatmapFramework.map((item, index) => (
                <div key={index} className={styles.heatmapCell} title={`${item.errors} errors on ${item.day}`}>
                    <div
                        className={styles.heatmapSquare}
                        style={{
                            backgroundColor: getColor(item.errors),
                            opacity: 0.3 + 0.7 * (item.errors / maxErrors),
                        }}
                    />
                    <div className={styles.heatmapLabel}>{item.day}</div>
                </div>
            ))}
        </div>
    );
};

const BugTracker = () => {
    const [stats, setStats] = useState(null); // Bắt đầu với null
    const [period, setPeriod] = useState('weekly');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            setError(null);
            try {
                // ✅ GỌI API THẬT
                const data = await apiService.getBugStats(period);
                // Kiểm tra dữ liệu trả về có hợp lệ không
                if (data && data.heatmap && data.topBugs) {
                    setStats(data);
                } else {
                    throw new Error("Invalid data structure received from server.");
                }
            } catch (err) {
                console.error("Failed to fetch bug stats:", err);
                setError(err.message || 'Could not load community bug data.');
                setStats(null); // Reset stats khi có lỗi
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [period]); // Chạy lại khi 'period' thay đổi
    
    const getLangStyle = (lang) => {
        const langColors = {
            'JavaScript': { backgroundColor: '#f7df1e', color: '#000' },
            'Python': { backgroundColor: '#3776ab', color: '#fff' },
            'Java': { backgroundColor: '#ed8b00', color: '#fff' },
            'C++': { backgroundColor: '#00599c', color: '#fff' },
            'React': { backgroundColor: '#61dafb', color: '#000' },
            'Node.js': { backgroundColor: '#339933', color: '#fff' },
            'TypeScript': { backgroundColor: '#3178c6', color: '#fff' },
            'PHP': { backgroundColor: '#777bb4', color: '#fff' },
            'Go': { backgroundColor: '#00add8', color: '#fff' },
            'Rust': { backgroundColor: '#000000', color: '#fff' },
        };
        return langColors[lang] || { backgroundColor: '#6b7280', color: '#fff' };
    };

    // --- RENDER LOGIC CẬP NHẬT ---
    const renderContent = () => {
        if (loading) {
            return <div className={styles.loadingText}>Loading community stats...</div>;
        }
        if (error) {
            return <div className={styles.errorText}>Error: {error}</div>;
        }
        if (!stats) {
            return <div className={styles.noDataText}>No bug tracking data available.</div>;
        }
        return (
            <div className={styles.content}>
                <div className={styles.heatmapContainer}>
                    <h3 className={styles.heatmapTitle}>Common Errors Heatmap</h3>
                    {/* ✅ Truyền period vào đây */}
                    <Heatmap data={stats.heatmap} period={period} />
                </div>
                <div className={styles.topBugsContainer}>
                    <h3 className={styles.topBugsTitle}>Top 5 Most Common Bugs</h3>
                    {stats.topBugs.map((bug, index) => (
                         <div 
                            key={index} 
                            className={styles.bugItem}
                         >
                            <div className={styles.bugInfo}>
                                <div className={styles.bugCategoryContainer}>
                                   <span className={styles.bugCategory}>{bug.category || 'Error'}</span>
                                   <span 
                                       className={styles.langBadge} 
                                       style={getLangStyle(bug.language)}
                                   >
                                       {bug.language}
                                   </span>
                                </div>
                                <div className={styles.bugMessage}>{bug.message}</div>
                            </div>
                            <div className={styles.bugCount}>{bug.count}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>🐞 Community Bug Tracker</h2>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabButton} ${period === 'weekly' ? styles.tabButtonActive : ''}`}
                        onClick={() => setPeriod('weekly')}
                    >
                        Weekly
                    </button>
                    <button
                        className={`${styles.tabButton} ${period === 'monthly' ? styles.tabButtonActive : ''}`}
                        onClick={() => setPeriod('monthly')}
                    >
                        Monthly
                    </button>
                </div>
            </div>
            {renderContent()}
        </div>
    );
};

export default BugTracker;