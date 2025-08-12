// LoginPage.jsx - Enhanced with detailed error messages
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import style from './LoginPage.module.css'; 
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState(''); // 'username' | 'password' | 'general'
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prevState => ({ ...prevState, [name]: value }));
        if (error) {
            setError('');
            setErrorType('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setErrorType('');

        if (!credentials.username.trim()) {
            setError('Please enter your username');
            setErrorType('username');
            setIsLoading(false);
            return;
        }

        if (!credentials.password.trim()) {
            setError('Please enter your password');
            setErrorType('password');
            setIsLoading(false);
            return;
        }

        try {
            const result = await login(credentials);
            
            if (result.success) {
                navigate('/');
            } else {
                // Handle different error types based on backend response
                if (result.errorType === 'USER_NOT_FOUND') {
                    setError('Username not found. Please check your username or create a new account.');
                    setErrorType('username');
                } else if (result.errorType === 'INVALID_PASSWORD') {
                    setError('Incorrect password. Please try again.');
                    setErrorType('password');
                } else if (result.errorType === 'ACCOUNT_LOCKED') {
                    setError('Account temporarily locked due to multiple failed attempts. Please try again later.');
                    setErrorType('general');
                } else if (result.errorType === 'ACCOUNT_DISABLED') {
                    setError('Your account has been disabled. Please contact support.');
                    setErrorType('general');
                } else {
                    // **FIXED: Improved fallback error message**
                    // Thay vì hiển thị lỗi chung, ta đưa ra thông báo gợi ý hơn
                    setError('Username or password incorrect. Please check your credentials and try again.');
                    setErrorType('general');
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            
            if (err.name === 'NetworkError' || err.message.includes('fetch')) {
                setError('Unable to connect to server. Please check your internet connection and try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
            setErrorType('general');
        } finally {
            setIsLoading(false);
        }
    };

    const getInputClass = (inputType) => {
        if (errorType === inputType) {
            return `${style.inputGroup} ${style.inputError}`;
        }
        return style.inputGroup;
    };

    return (
        <div className={style.authContainer}>
            <form className={style.authForm} onSubmit={handleSubmit}>
                <div className={style.authBrand}>
                    <span className={style.brandIcon}>🔥</span>
                    <div className={style.brandText}>Welcome Back</div>
                </div>
                
                <h2>Log In</h2>
                
                {error && (
                    <div className={style.errorList}>
                        <AlertCircle size={16} className={style.errorIcon} />
                        {error}
                    </div>
                )}
                
                <div className={style.formGroup}>
                    <label htmlFor="username">Username</label>
                    <div className={getInputClass('username')}>
                        <input
                            type="text" 
                            name="username" 
                            id="username"
                            value={credentials.username} 
                            onChange={handleChange}
                            placeholder="Enter your username" 
                            required
                            autoComplete="username"
                        />
                        <User className={style.inputIcon} size={18} />
                    </div>
                    {errorType === 'username' && (
                        <div className={style.fieldError}>
                            Please check your username
                        </div>
                    )}
                </div>
                
                <div className={style.formGroup}>
                    <label htmlFor="password">Password</label>
                    <div className={getInputClass('password')}>
                        <input
                            type={showPassword ? "text" : "password"} 
                            name="password" 
                            id="password"
                            value={credentials.password} 
                            onChange={handleChange}
                            placeholder="Enter your password" 
                            required
                            autoComplete="current-password"
                        />
                        <Lock className={style.inputIcon} size={18} />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className={style.togglePassword}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {errorType === 'password' && (
                        <div className={style.fieldError}>
                            Please check your password
                        </div>
                    )}
                </div>
                
                <button type="submit" className={style.submitButton} disabled={isLoading}>
                    {isLoading ? 'Logging In...' : 'Log In'}
                </button>
                
                <div className={style.authFooter}>
                    <p>New to our community?</p>
                    <Link to="/register">Create Account</Link>
                </div>
            </form>
        </div>
    );
};

export default LoginPage;