// RegisterPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { User, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import style from './RegisterPage.module.css'; 

const RegisterPage = ({ onLogin }) => {
    const [formData, setFormData] = useState({ username: '', password: '', password_confirm: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState({ password: false, password_confirm: false });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.password_confirm) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError('');

        try {
            // Bước 1: Gọi API đăng ký
            await api.auth.register({
                username: formData.username,
                password: formData.password,
                password_confirm: formData.password_confirm
            });

            // Bước 2: Tự động đăng nhập để lấy thông tin user và session
            const loginResponse = await api.auth.login({
                username: formData.username,
                password: formData.password
            });
            
            // Cập nhật trạng thái global
            if (onLogin) {
                onLogin(loginResponse.user);
            }

            navigate('/'); // Chuyển hướng
        } catch (err) {
            setError(err.message || 'Registration failed. Username may already exist.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const togglePasswordVisibility = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className={style.container}>
            <form className={style.form} onSubmit={handleSubmit}>
                <div className={style.brand}><span className={style.brandIcon}>🔥</span><p className={style.brandText}>Join the Community</p></div>
                <h2 className={style.title}>Sign Up</h2>
                {error && <div className={style.errorList}>{error}</div>}

                <div className={style.formGroup}>
                    <label htmlFor="username" className={style.label}>Username</label>
                    <div className={style.inputGroup}>
                        <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a unique username" required />
                        <User className={style.inputIcon} size={18} />
                    </div>
                </div>

                <div className={style.formGroup}>
                    <label htmlFor="password" className={style.label}>Password</label>
                    <div className={style.inputGroup}>
                        <input type={showPassword.password ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Create a strong password" required />
                        <Lock className={style.inputIcon} size={18} />
                        <button type="button" onClick={() => togglePasswordVisibility('password')} className={style.togglePassword}><Eye size={16} /></button>
                    </div>
                </div>

                <div className={style.formGroup}>
                    <label htmlFor="password_confirm" className={style.label}>Confirm Password</label>
                    <div className={style.inputGroup}>
                        <input type={showPassword.password_confirm ? "text" : "password"} id="password_confirm" name="password_confirm" value={formData.password_confirm} onChange={handleChange} placeholder="Confirm your password" required />
                        <Shield className={style.inputIcon} size={18} />
                        <button type="button" onClick={() => togglePasswordVisibility('password_confirm')} className={style.togglePassword}><Eye size={16} /></button>
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className={style.submitButton}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className={style.footer}><p>Already have an account?</p><Link to="/login">Sign In</Link></div>
            </form>
        </div>
    );
};

export default RegisterPage;