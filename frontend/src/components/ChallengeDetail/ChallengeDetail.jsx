// src/components/ChallengeDetail.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Trophy, CheckSquare, Code, Terminal, Upload } from 'lucide-react';
import apiService from '../../services/api';
import styles from './ChallengeDetail.module.css'; // Sẽ tạo file CSS

const ChallengeDetail = () => {
    const { challengeId } = useParams();
    const [challenge, setChallenge] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userCode, setUserCode] = useState('');
    const [submissionResult, setSubmissionResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChallenge = async () => {
            if (!challengeId) return;
            setLoading(true);
            setError(null);
            try {
                const data = await apiService.getChallengeDetail(challengeId);
                setChallenge(data);
                // Gợi ý code cho người dùng từ đáp án
                if (data.solution_code) {
                    const functionSignature = data.solution_code.split('\n')[0];
                    setUserCode(functionSignature + '\n  # Your code here\n  pass');
                }
            } catch (err) {
                console.error("Error fetching challenge:", err);
                setError(err.message || 'Failed to load the challenge.');
            } finally {
                setLoading(false);
            }
        };
        fetchChallenge();
    }, [challengeId]);

    const buildTestRunnerCode = (userSolution, testCases) => {
        // Lấy tên hàm từ dòng đầu tiên của code người dùng
        const functionNameMatch = userSolution.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (!functionNameMatch) {
            // Trường hợp không tìm thấy tên hàm (ví dụ: người dùng xóa mất)
            alert("Could not find a valid Python function definition (def function_name(...):) in your solution.");
            return null;
        }
        const functionName = functionNameMatch[1];

        // Chuyển đổi test cases từ JSON sang chuỗi Python
        const testCasesPython = JSON.stringify(testCases, null, 4);

        // Tạo bộ khung test
        const testRunnerTemplate = `
# --------------------------------------------------
# 🐍 DevCove Challenge Runner
# Your solution is being tested against the following cases.
# --------------------------------------------------

# Your Submitted Solution:
${userSolution}

# Test Cases:
test_cases = ${testCasesPython}

# Test Harness:
def run_tests():
    challenge_title = ${JSON.stringify(challenge.title)} # <-- Gán title vào một biến Python
    print(f"🚀 Running {len(test_cases)} test cases for '{challenge_title}'...") # <-- Sử dụng biến đó
    passed_count = 0
    failed_cases = []

    for i, test in enumerate(test_cases):
        input_args = test['input']
        expected_output = test['expected']
        
        try:
            actual_output = ${functionName}(*input_args)
            
            if actual_output == expected_output:
                print(f"  ✅ Test Case #{i+1}: PASSED")
                passed_count += 1
            else:
                print(f"  ❌ Test Case #{i+1}: FAILED")
                print(f"     - Input: {input_args}")
                print(f"     - Expected: {expected_output}")
                print(f"     - Got: {actual_output}")
                failed_cases.append(i+1)
        
        except Exception as e:
            print(f"  🔥 Test Case #{i+1}: ERROR")
            print(f"     - Input: {input_args}")
            print(f"     - An error occurred during execution: {e}")
            failed_cases.append(i+1)
            
    print("\\n--------------------------------------------------")
    if passed_count == len(test_cases):
        print(f"🎉 SUCCESS! All {passed_count}/{len(test_cases)} test cases passed!")
    else:
        print(f"😕 FAILED. {passed_count}/{len(test_cases)} test cases passed.")
        print(f"   Check failed cases: {failed_cases}")
    print("--------------------------------------------------")

# Run the harness
run_tests()
`;
        return testRunnerTemplate;
    };

    const handleSubmission = async () => {
        if (!userCode.trim()) {
            alert("Please write some code before submitting.");
            return;
        }

        // Xây dựng code hoàn chỉnh để chạy
        const fullTestCode = buildTestRunnerCode(userCode, challenge.test_cases);

        if (!fullTestCode) {
            // Lỗi đã được alert trong hàm buildTestRunnerCode
            return;
        }

        try {
            // Lưu code vào sessionStorage để sandbox đọc
            sessionStorage.setItem('sandbox_code', fullTestCode);
            // Gửi thông tin ngôn ngữ là 'python'
            sessionStorage.setItem('sandbox_code_language', 'python'); 
            
            // Mở sandbox trong một tab mới
            window.open('/sandbox', '_blank');

            // Cập nhật UI ở trang hiện tại (tùy chọn)
            setSubmissionResult({
                success: null, // Chưa biết kết quả
                message: "Your solution has been sent to the Sandbox for testing. Check the new tab for results!",
            });

        } catch (err) {
            console.error("Failed to send to sandbox:", err);
            setError("Could not open the sandbox runner. Please check browser pop-up settings.");
        }
    };

    if (loading) return <div className={styles.statusMessage}>Loading Challenge...</div>;
    if (error) return <div className={styles.statusMessage} style={{color: '#ff8e8e'}}>{error}</div>;
    if (!challenge) return <div className={styles.statusMessage}>Challenge not found.</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Trophy size={40} className={styles.headerIcon} />
                <div>
                    <h1>{challenge.title}</h1>
                    <p className={styles.meta}>
                        Posted by {challenge.created_by.username} on {new Date(challenge.published_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className={styles.mainContent}>
                {/* Cột trái: Mô tả và Test Cases */}
                <div className={styles.leftColumn}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Description</h2>
                        <div className={styles.prose}>
                            <ReactMarkdown>{challenge.description}</ReactMarkdown>
                        </div>
                    </div>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Test Cases</h2>
                        <div className={styles.testCases}>
                            {challenge.test_cases.map((tc, index) => (
                                <div key={index} className={styles.testCase}>
                                    <span className={styles.testCaseLabel}>Test {index + 1}:</span>
                                    <code className={styles.testCaseCode}>
                                        Input: {JSON.stringify(tc.input)}, Expected: {JSON.stringify(tc.expected)}
                                    </code>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cột phải: Khu vực code và submit */}
                <div className={styles.rightColumn}>
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}><Code size={20}/> Your Solution</h2>
                        <textarea
                            className={styles.codeInput}
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                            placeholder="Write your Python solution here..."
                            rows={15}
                        />
                         <button onClick={handleSubmission} className={styles.submitButton} disabled={isSubmitting}>
                            <Upload size={18} />
                            {isSubmitting ? 'Running...' : 'Submit Solution'}
                        </button>
                    </div>
                   
                    {submissionResult && (
                         <div className={styles.section}>
                            <h2 className={styles.sectionTitle}><Terminal size={20}/> Result</h2>
                            <div className={`${styles.resultBox} ${submissionResult.success ? styles.success : styles.failure}`}>
                                <p>{submissionResult.message}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChallengeDetail;