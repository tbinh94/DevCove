// LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import style from './LoginPage.module.css'; 
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prevState => ({ ...prevState, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log('Attempting login with credentials:', { username: credentials.username });
            
            const result = await login(credentials);
            
            console.log('Login result:', result);
            
            if (result.success) {
                console.log('Login successful, navigating to home');
                navigate('/');
            } else {
                console.log('Login failed:', result.error);
                setError(result.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={style.authContainer}>
            <form className={style.authForm} onSubmit={handleSubmit}>
                <div className={style.authBrand}>
                    <span className={style.brandIcon}>🔥</span>
                    <div className={style.brandText}>Welcome Back</div>
                </div>
                
                <h2>Log In</h2>
                
                {error && <div className={style.errorList}>{error}</div>}
                
                <div className={style.formGroup}>
                    <label htmlFor="username">Username</label>
                    <div className={style.inputGroup}>
                        <input
                            type="text" name="username" id="username"
                            value={credentials.username} onChange={handleChange}
                            placeholder="Enter your username" required
                        />
                        <User className={style.inputIcon} size={18} />
                    </div>
                </div>
                
                <div className={style.formGroup}>
                    <label htmlFor="password">Password</label>
                    <div className={style.inputGroup}>
                        <input
                            type={showPassword ? "text" : "password"} name="password" id="password"
                            value={credentials.password} onChange={handleChange}
                            placeholder="Enter your password" required
                        />
                        <Lock className={style.inputIcon} size={18} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={style.togglePassword}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
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