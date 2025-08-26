import React, { useState } from 'react';
import apiService from '../../../services/api'; 
import AsyncSelect from 'react-select/async';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import styles from './CodeQualityAudit.module.css';
import customSelectStyles from './selectStyles';

const CodeQualityAudit = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadOptions = async (inputValue) => {
        if (!inputValue || inputValue.length < 1) {
            return [];
        }
        try {
            const data = await apiService.searchUsers(inputValue);
            if (data && Array.isArray(data.users)) {
                return data.users.map(user => ({
                    value: user.id,
                    label: user.username
                }));
            }
            return [];
        } catch (err) {
            console.error("Failed to search for users:", err);
            return [];
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser && (!startDate || !endDate)) {
            setError('Please select a user or a full date range.');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        const payload = {};
        if (selectedUser) payload.user_id = selectedUser.value;
        if (startDate && endDate) {
            payload.start_date = startDate.toISOString();
            payload.end_date = endDate.toISOString();
        }

        try {
            const response = await apiService.postAuditReport(payload);
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/pdf')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                const disposition = response.headers.get('content-disposition');
                let filename = `code_audit_${Date.now()}.pdf`;
                if (disposition) {
                    const filenameMatch = disposition.match(/filename="?(.+)"?/);
                    if (filenameMatch && filenameMatch.length > 1) {
                        filename = filenameMatch[1];
                    }
                }
                
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);

            } else {
                const jsonResponse = await response.json();
                setMessage(jsonResponse.message || 'An unexpected response was received from the server.');
            }
            
        } catch (err) {
            setError(err.data?.error || err.message || 'An unexpected server error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // Custom date picker input component
    const DateInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
        <input
            ref={ref}
            value={value}
            onClick={onClick}
            placeholder={placeholder}
            readOnly
            className={styles.dateInput}
        />
    ));

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>AI Code Quality Audit</h2>
                <p className={styles.description}>
                    Generate a comprehensive code quality report for a specific user or time period. 
                    DevAlly will analyze all code submissions matching the criteria.
                </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>
                        Select User 
                    </label>
                    <div className={styles.selectContainer}>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadOptions}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            isClearable
                            placeholder="Type to search for a user..."
                            styles={customSelectStyles}
                        />
                    </div>
                </div>

                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Start Date (Optional)
                        </label>
                        <div className={styles.datePickerWrapper}>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText="Select start date"
                                customInput={<DateInput />}
                            />
                        </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            End Date (Optional)
                        </label>
                        <div className={styles.datePickerWrapper}>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText="Select end date"
                                customInput={<DateInput />}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className={`${styles.alert} ${styles.alertError}`}>
                        {error}
                    </div>
                )}

                {message && (
                    <div className={`${styles.alert} ${styles.alertInfo}`}>
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading ? (
                        <>
                            <svg 
                                className={styles.spinner} 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle 
                                    cx="12" 
                                    cy="12" 
                                    r="10" 
                                    stroke="currentColor" 
                                    strokeWidth="4"
                                    className="opacity-25"
                                />
                                <path 
                                    fill="currentColor" 
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    className="opacity-75"
                                />
                            </svg>
                            Generating Report...
                        </>
                    ) : (
                        'Generate Audit Report (PDF)'
                    )}
                </button>
            </form>
        </div>
    );
};

export default CodeQualityAudit;