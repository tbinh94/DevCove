// src/components/CodeTabs.jsx
import React from 'react';
import styles from './CodeTabs.module.css'; // Sẽ tạo file CSS ở bước sau

const CodeTabs = ({ examples, activeTab, onTabClick }) => {
  return (
    <div className={styles.tabContainer}>
      {Object.keys(examples).map((key) => (
        <button
          key={key}
          className={`${styles.tabButton} ${activeTab === key ? styles.active : ''}`}
          onClick={() => onTabClick(key)}
        >
          {/* Tên ví dụ được viết hoa chữ cái đầu */}
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default CodeTabs;