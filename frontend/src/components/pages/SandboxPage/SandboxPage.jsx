// src/pages/SandboxPage/SandboxPage.jsx
import React from 'react';
import JSSandbox from './JSSandbox'; // Import component JSSandbox đã tạo trước đó
import styles from './SandboxPage.module.css';

const SandboxPage = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Code Sandbox</h1>
        <p>Execute code securely in different languages.</p>
      </header>
      
      <div className={styles.sandboxWrapper}>
        {/* Hiện tại chỉ có JS Sandbox, sau này có thể thêm các tab khác */}
        <JSSandbox />
      </div>
    </div>
  );
};

export default SandboxPage;