import React from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <span className={styles.footerText}>
          © 2025 DevCove. All rights reserved. | Developed with ❤️
          <a href="https://www.linkedin.com/in/ca-diep-thanh-binh" target="_blank" className={styles.link}>Thanh Binh</a>
        </span>
      </div>
    </footer>
  );
}