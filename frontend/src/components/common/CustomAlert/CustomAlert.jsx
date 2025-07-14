// src/components/common/CustomAlert/CustomAlert.jsx

import React from 'react';
import styles from './CustomAlert.module.css';

const CustomAlert = ({ message, show, onClose }) => {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.customAlertContainer}>
      <div className={styles.customAlert}>
        <span className={styles.customAlertMessage}>{message}</span>
        <button className={styles.customAlertClose} onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default CustomAlert;