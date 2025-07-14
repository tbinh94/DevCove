import React, { useState } from 'react';
//import './Settings.css';

const Settings = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    avatar: null
  });
  
  const [avatarPreview, setAvatarPreview] = useState('/imgs/avatar-default.png');
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        avatar: file
      }));
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        setAvatarPreview(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
  };

  return (
    <div className="settings-container fade-in-up">
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="auth-form">
        <div className="form-header">
          <h2>⚙️ Account Settings</h2>
          <p className="form-subtitle">Customize your profile and preferences</p>
        </div>

        {/* USER INFO */}
        <div className="form-group">
          <label htmlFor="firstName">First Name:</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className="form-input"
          />
          {errors.firstName && <div className="error">{errors.firstName}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name:</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className="form-input"
          />
          {errors.lastName && <div className="error">{errors.lastName}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="form-input"
          />
          {errors.email && <div className="error">{errors.email}</div>}
        </div>

        {/* AVATAR */}
        <div className="form-group avatar-group">
          <label htmlFor="avatar">Avatar:</label>
          <div className="avatar-wrapper">
            <img
              id="avatarPreview"
              src={avatarPreview}
              className="avatar-preview"
              alt="User avatar"
            />
          </div>
          <input
            type="file"
            id="avatar"
            name="avatar"
            accept="image/*"
            onChange={handleAvatarChange}
            className="form-input"
          />
          {errors.avatar && <div className="error">{errors.avatar}</div>}
        </div>

        <button type="submit" className="btn btn-primary save-btn">
          <span className="btn-icon">💾</span>
          <span>Save Changes</span>
        </button>
      </form>

      <div className="settings-links">
        <a href="/password_change" className="settings-link">
          <span className="link-icon">🔒</span>
          <span>Change Password</span>
          <span className="link-arrow">→</span>
        </a>
      </div>
    </div>
  );
};

export default Settings;