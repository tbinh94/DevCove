import React, { useState, useEffect } from 'react'; 
import apiService from '../../services/api'; 
import { useAuthContext } from '../../contexts/AuthContext'; 
import DefaultAvatar from '../../assets/imgs/avatar-default.png';
import styles from './Settings.module.css';

const Settings = () => {
  const { user, updateUser } = useAuthContext(); 

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    avatar: null,
  });
  const [avatarPreview, setAvatarPreview] = useState(DefaultAvatar);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.username) {
        try {
          // Gọi API để lấy profile đầy đủ giống như trong Header.jsx
          const response = await apiService.getUserProfile(user.username);
          const profile = response.profile;
          
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            bio: profile?.bio || '',
            avatar: null,
          });
          
          // Set avatar preview từ profile hoặc default
          const avatarUrl = profile?.avatar_url;
          setAvatarPreview(avatarUrl || DefaultAvatar);
          
        } catch (error) {
          console.error("Failed to fetch user profile for settings:", error);
          // Fallback to user data if API call fails
          setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            bio: user.profile?.bio || '',
            avatar: null,
          });
          setAvatarPreview(user.profile?.avatar_url || DefaultAvatar);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, avatar: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    const data = new FormData();
    data.append('first_name', formData.first_name);
    data.append('last_name', formData.last_name);
    data.append('email', formData.email);
    data.append('bio', formData.bio);
    if (formData.avatar) {
      data.append('avatar', formData.avatar);
    }

    try {
      const updatedUserData = await apiService.updateUserProfile(user.username, data);
      updateUser(updatedUserData); 
      setSuccessMessage('Profile updated successfully!');    
    } catch (error) {
      const errorData = error.response?.data || {};
      setErrors(errorData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.settingsContainer} ${styles.fadeInUp}`}>
      <form onSubmit={handleSubmit} encType="multipart/form-data" className={styles.authForm}>
        <div className={styles.formHeader}>
          <h2>⚙️ Account Settings</h2>
          <p className={styles.formSubtitle}>Customize your profile and preferences</p>
        </div>

        {successMessage && <div className={`${styles.alert} ${styles.alertSuccess}`}>{successMessage}</div>}

        {/* First Name */}
        <div className={styles.formGroup}>
          <label htmlFor="first_name">First Name:</label>
          <input
            type="text"
            id="first_name"
            name="first_name"
            value={formData.first_name}
            onChange={handleInputChange}
            className={styles.formInput}
          />
          {errors.first_name && <div className={styles.error}>{errors.first_name}</div>}
        </div>
        
        {/* Last Name */}
        <div className={styles.formGroup}>
          <label htmlFor="last_name">Last Name:</label>
          <input
            type="text"
            id="last_name"
            name="last_name"
            value={formData.last_name}
            onChange={handleInputChange}
            className={styles.formInput}
          />
          {errors.last_name && <div className={styles.error}>{errors.last_name}</div>}
        </div>

        {/* Email */}
        <div className={styles.formGroup}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={styles.formInput}
          />
          {errors.email && <div className={styles.error}>{errors.email}</div>}
        </div>

        {/* Bio */}
        <div className={styles.formGroup}>
            <label htmlFor="bio">Bio:</label>
            <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className={styles.formInput}
                rows="3"
            ></textarea>
            {errors.bio && <div className={styles.error}>{errors.bio}</div>}
        </div>

        {/* Avatar */}
        <div className={`${styles.formGroup} ${styles.avatarGroup}`}>
          <label htmlFor="avatar">Avatar:</label>
          <div className={styles.avatarWrapper}>
            <img 
              src={avatarPreview} 
              className={styles.avatarPreview} 
              alt="User avatar"
              onError={(e) => {
                // Nếu avatar bị lỗi, fallback về default avatar
                e.target.src = DefaultAvatar;
              }}
            />
          </div>
          <input
            type="file"
            id="avatar"
            name="avatar"
            accept="image/*"
            onChange={handleAvatarChange}
            className={styles.formInput}
          />
          {errors.avatar && <div className={styles.error}>{errors.avatar}</div>}
        </div>

        <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${styles.saveBtn}`} disabled={loading}>
          <span className={styles.btnIcon}>💾</span>
          <span>{loading ? 'Saving...' : 'Save Changes'}</span>
        </button>

        <button 
          type="button" 
          className={`${styles.btn} ${styles.btnSecondary} ${styles.backBtn}`} 
          onClick={() => window.location.href = '/'}
        >
          <span className={styles.btnIcon}>🏠</span>
          <span>Back to Home</span>
        </button>
      </form>
    </div>
  );
};

export default Settings;