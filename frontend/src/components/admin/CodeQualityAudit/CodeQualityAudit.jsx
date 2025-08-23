import React, { useState } from 'react';
// ✅ 1. Import apiService để sử dụng các hàm đã được chuẩn hóa
import apiService from '../../../services/api'; 
import AsyncSelect from 'react-select/async';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const CodeQualityAudit = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    /**
     * ✅ 2. Hàm loadOptions để AsyncSelect gọi mỗi khi người dùng gõ
     *    Nó sử dụng hàm apiService.searchUsers mà chúng ta đã tạo.
     */
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
            return []; // Luôn trả về mảng rỗng khi có lỗi
        }
    };

    /**
     * ✅ 3. Hàm handleSubmit sử dụng apiService.postAuditReport
     *    Hàm này đã được thiết kế để xử lý CSRF và nhận file PDF.
     */
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
            // 1. Gọi API, hàm này trả về đối tượng Response gốc
            const response = await apiService.postAuditReport(payload);

            // 2. Kiểm tra Content-Type mà KHÔNG đọc body
            const contentType = response.headers.get('content-type');

            // 3. QUYẾT ĐỊNH và chỉ đọc body MỘT LẦN
            if (contentType?.includes('application/pdf')) {
                // *** Nhánh 1: Xử lý file PDF ***
                // Đọc body DUY NHẤT một lần dưới dạng blob
                const blob = await response.blob();
                
                // Tạo URL và link để tải xuống
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

                // Dọn dẹp
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);

            } else {
                // *** Nhánh 2: Xử lý các response khác (ví dụ: JSON) ***
                // Đọc body DUY NHẤT một lần dưới dạng JSON
                const jsonResponse = await response.json();
                setMessage(jsonResponse.message || 'An unexpected response was received from the server.');
            }
            
        } catch (err) {
            // Lỗi đã được apiService xử lý và ném ra
            // err.data chứa nội dung lỗi đã được parse
            setError(err.data?.error || err.message || 'An unexpected server error occurred.');
        } finally {
            setLoading(false);
        }
    };
    
    // --- Các phần còn lại để render giao diện (không đổi) ---

    const datePickerInput = (
        <input 
            className="w-full p-2 border rounded-md" 
            style={{ backgroundColor: '#334155', color: '#f1f5f9', borderColor: '#475569' }}
        />
    );
    
    const selectStyles = {
        control: (base) => ({ ...base, backgroundColor: '#334155', borderColor: '#475569', border: 'none', boxShadow: 'none' }),
        menu: (base) => ({ ...base, backgroundColor: '#334155' }),
        option: (base, { isFocused, isSelected }) => ({
            ...base,
            backgroundColor: isSelected ? '#4f46e5' : isFocused ? '#475569' : '#334155',
            color: '#f1f5f9',
            ':active': { backgroundColor: '#4338ca' },
        }),
        singleValue: (base) => ({ ...base, color: '#f1f5f9' }),
        input: (base) => ({ ...base, color: '#f1f5f9' }),
        placeholder: (base) => ({...base, color: '#94a3b8'}),
        indicatorSeparator: () => ({ display: 'none' }),
        dropdownIndicator: (base) => ({...base, color: '#94a3b8', ':hover': {color: '#f1f5f9'}})
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md" style={{ background: '#1e293b', color: '#cbd5e0' }}>
            <h2 className="text-2xl font-bold mb-4 text-gray-800" style={{ color: '#f1f5f9' }}>AI Code Quality Audit</h2>
            <p className="mb-6 text-gray-600" style={{ color: '#94a3b8' }}>
                Generate a comprehensive code quality report for a specific user or time period. 
                The AI will analyze all code submissions matching the criteria.
            </p>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: '#cbd5e0' }}>
                            Select User (Optional)
                        </label>
                        <AsyncSelect
                            cacheOptions
                            defaultOptions
                            loadOptions={loadOptions}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            isClearable
                            placeholder="Type to search for a user..."
                            styles={selectStyles}
                        />
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: '#cbd5e0' }}>
                                Start Date (Optional)
                            </label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText="Select start date"
                                customInput={datePickerInput}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: '#cbd5e0' }}>
                                End Date (Optional)
                            </label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText="Select end date"
                                customInput={datePickerInput}
                            />
                        </div>
                    </div>
                </div>

                {error && <div className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md" style={{ color: '#fca5a5', backgroundColor: 'rgba(220, 38, 38, 0.2)' }}>{error}</div>}
                {message && <div className="mt-4 text-sm text-blue-600 bg-blue-100 p-3 rounded-md" style={{ color: '#93c5fd', backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>{message}</div>}

                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Report...
                            </>
                        ) : (
                            'Generate Audit Report (PDF)'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CodeQualityAudit;