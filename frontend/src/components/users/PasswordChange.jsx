import React, { useState } from 'react';
import styles from './PasswordChange.module.css';

const PasswordChange = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword1: '',
    newPassword2: ''
  });
  
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword1: false,
    newPassword2: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPassword(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }
    
    if (!formData.newPassword1) {
      newErrors.newPassword1 = 'New password is required';
    } else if (formData.newPassword1.length < 8) {
      newErrors.newPassword1 = 'Password must be at least 8 characters long';
    }
    
    if (!formData.newPassword2) {
      newErrors.newPassword2 = 'Please confirm your new password';
    } else if (formData.newPassword1 !== formData.newPassword2) {
      newErrors.newPassword2 = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle success
      alert('Password updated successfully!');
      setFormData({
        oldPassword: '',
        newPassword1: '',
        newPassword2: ''
      });
    } catch (error) {
      setErrors({
        general: 'Failed to update password. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSettings = () => {
    // Navigate back to settings page
    console.log('Navigate back to settings');
  };

  return (
    <div className={styles.passwordChangeContainer}>
      <form onSubmit={handleSubmit} className={styles.authForm}>
        <div className={styles.formHeader}>
          <h2>🔐 Change Password</h2>
          <p className={styles.formSubtitle}>Keep your account secure with a strong password</p>
        </div>
        
        <div className={styles.securityNotice}>
          <div className={styles.noticeIcon}>🛡️</div>
          <div className={styles.noticeContent}>
            <h4>Security Tips</h4>
            <ul>
              <li>Use at least 8 characters</li>
              <li>Include numbers and special characters</li>
              <li>Don't reuse passwords from other sites</li>
            </ul>
          </div>
        </div>
        
        <div className={styles.formContent}>
          {errors.general && (
            <div className={styles.formErrors}>
              {errors.general}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="oldPassword">
              Current Password
              <span className={styles.required}>*</span>
            </label>
            
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword.oldPassword ? 'text' : 'password'}
                id="oldPassword"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleInputChange}
                className={errors.oldPassword ? styles.error : ''}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('oldPassword')}
              >
                <span className={styles.toggleIcon}>
                  {showPassword.oldPassword ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
            
            {errors.oldPassword && (
              <ul className={styles.errorlist}>
                <li>{errors.oldPassword}</li>
              </ul>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword1">
              New Password
              <span className={styles.required}>*</span>
            </label>
            
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword.newPassword1 ? 'text' : 'password'}
                id="newPassword1"
                name="newPassword1"
                value={formData.newPassword1}
                onChange={handleInputChange}
                className={errors.newPassword1 ? styles.error : ''}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('newPassword1')}
              >
                <span className={styles.toggleIcon}>
                  {showPassword.newPassword1 ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
            
            <div className={styles.helptext}>
              Your password must contain at least 8 characters and include numbers and special characters.
            </div>
            
            {errors.newPassword1 && (
              <ul className={styles.errorlist}>
                <li>{errors.newPassword1}</li>
              </ul>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="newPassword2">
              Confirm New Password
              <span className={styles.required}>*</span>
            </label>
            
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword.newPassword2 ? 'text' : 'password'}
                id="newPassword2"
                name="newPassword2"
                value={formData.newPassword2}
                onChange={handleInputChange}
                className={errors.newPassword2 ? styles.error : ''}
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => togglePasswordVisibility('newPassword2')}
              >
                <span className={styles.toggleIcon}>
                  {showPassword.newPassword2 ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
            
            {errors.newPassword2 && (
              <ul className={styles.errorlist}>
                <li>{errors.newPassword2}</li>
              </ul>
            )}
          </div>
        </div>
        
        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.primaryBtn}
            disabled={isLoading}
          >
            <span>{isLoading ? '🔄 Updating...' : '🔄 Update Password'}</span>
          </button>
          <button 
            type="button"
            className={styles.secondaryBtn}
            onClick={handleBackToSettings}
          >
            <a href='/settings'>← Back to Settings</a>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChange;