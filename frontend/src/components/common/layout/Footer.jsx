import React from 'react';
// 1. Import CSS module
import styles from './Footer.module.css';

export default function Footer() {
  return (
    // 2. Sử dụng các class từ object 'styles' đã import
    <footer className={styles.footer}>
      <div className={styles.container}>
        <span className={styles.footerText}>
          © 2025 DevCove. All rights reserved. | Developed with ❤️
          <a href="#" className={styles.link}>Thanh Binh</a>
        </span>
      </div>
    </footer>
  );
}