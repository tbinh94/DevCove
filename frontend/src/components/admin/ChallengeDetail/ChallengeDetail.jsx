// Component này hiển thị chi tiết của challenge, cho phép người dùng xem mô tả, test cases và gửi bài nộp
// chứa logic hiển thị chi tiết, kiểm tra ngôn ngữ, fetch bài nộp, và điều hướng đến Sandbox hoặc gửi đi review.
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Trophy, Code, Terminal, Upload } from 'lucide-react';
import apiService from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import SubmissionStatus from '../SubmissionStatus'; // Đảm bảo bạn đã tạo file này
import styles from './ChallengeDetail.module.css';

const ChallengeDetail = () => {
    const { challengeId } = useParams();
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [challenge, setChallenge] = useState(null);
    const [mySubmission, setMySubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userCode, setUserCode] = useState('');
    const [submissionResult, setSubmissionResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const RUNNABLE_LANGUAGES = ['python', 'javascript', 'html', 'css'];

    const capitalize = (s) => {
        if (typeof s !== 'string' || s.length === 0) return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            if (!challengeId) return;
            setLoading(true);
            setError(null);
            setMySubmission(null); // Reset submission state on new challenge load
            
            try {
                const challengeData = await apiService.getChallengeDetail(challengeId);
                setChallenge(challengeData);

                let currentUserSubmission = null;
                if (isAuthenticated) {
                    try {
                        const submissionData = await apiService.getMyLatestSubmission(challengeId);
                        setMySubmission(submissionData);
                        currentUserSubmission = submissionData;
                    } catch (subError) {
                        if (subError.status !== 204) { // 204 No Content is not a real error
                            console.warn("Could not fetch user submission:", subError);
                        }
                    }
                }
                
                if (currentUserSubmission && currentUserSubmission.submitted_code) {
                    setUserCode(currentUserSubmission.submitted_code);
                } else if (challengeData.solution_code) {
                    const functionSignature = challengeData.solution_code.split('\n')[0];
                    let placeholder = '';
                    if (challengeData.language === 'python') {
                        placeholder = '\n  # Your code here\n  pass';
                    } else if (challengeData.language === 'javascript') {
                        placeholder = '\n  // Your code here\n}';
                    }
                    setUserCode(functionSignature + placeholder);
                }

            } catch (err) {
                console.error("Error fetching challenge data:", err);
                setError(err.message || 'Failed to load the challenge.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [challengeId, isAuthenticated]);


    const buildPythonTestRunner = (userSolution, testCases) => {
        const functionNameMatch = userSolution.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (!functionNameMatch) {
            alert("Could not find a valid Python function definition (def function_name(...):) in your solution.");
            return null;
        }
        const functionName = functionNameMatch[1];
        const testCasesPython = JSON.stringify(testCases, null, 4);

        return `
# Your Submitted Solution:
${userSolution}

# Test Harness:
def run_tests():
    challenge_title = ${JSON.stringify(challenge.title)}
    test_cases = ${testCasesPython}
    print(f"🚀 Running {len(test_cases)} test cases for '{challenge_title}'...")
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
            print(f"     - An error occurred: {e}")
            failed_cases.append(i+1)
            
    print("\\n--------------------------------------------------")
    if passed_count == len(test_cases):
        print(f"🎉 SUCCESS! All {passed_count}/{len(test_cases)} test cases passed!")
    else:
        print(f"😕 FAILED. {passed_count}/{len(test_cases)} test cases passed.")
        print(f"   Check failed cases: {failed_cases}")
    print("--------------------------------------------------")

run_tests()
`;
    };
    
    const buildJavaScriptTestRunner = (userSolution, testCases) => {
        const functionNameMatch = userSolution.match(/(?:function\s+|const\s+|let\s+|var\s+)([a-zA-Z0-9_]+)\s*(?:=|\()/);
        if (!functionNameMatch) {
            alert("Could not find a valid JavaScript function definition (e.g., function name(...) or const name = (...) =>) in your solution.");
            return null;
        }
        const functionName = functionNameMatch[1];
        const testCasesJs = JSON.stringify(testCases);

        return `
// Your Submitted Solution:
${userSolution}

// Test Harness:
try {
    const testCases = ${testCasesJs};
    const challengeTitle = ${JSON.stringify(challenge.title)};

    console.log(\`🚀 Running \${testCases.length} test cases for '\${challengeTitle}'...\`);
    let passedCount = 0;
    const failedCases = [];

    testCases.forEach((test, i) => {
        const inputArgs = test.input;
        const expectedOutput = test.expected;
        
        try {
            const actualOutput = ${functionName}(...inputArgs);
            if (JSON.stringify(actualOutput) === JSON.stringify(expectedOutput)) {
                console.log(\`  ✅ Test Case #\${i+1}: PASSED\`);
                passedCount++;
            } else {
                console.error(\`  ❌ Test Case #\${i+1}: FAILED\`);
                console.warn(\`     - Input: \`, ...inputArgs);
                console.warn(\`     - Expected: \`, expectedOutput);
                console.warn(\`     - Got: \`, actualOutput);
                failedCases.push(i + 1);
            }
        } catch (e) {
            console.error(\`  🔥 Test Case #\${i+1}: ERROR\`);
            console.warn(\`     - Input: \`, ...inputArgs);
            console.error(\`     - An error occurred: \`, e.message);
            failedCases.push(i + 1);
        }
    });

    console.log("\\n--------------------------------------------------");
    if (passedCount === testCases.length) {
        console.log(\`🎉 SUCCESS! All \${passedCount}/\${testCases.length} test cases passed!\`);
    } else {
        console.error(\`😕 FAILED. \${passedCount}/\${testCases.length} test cases passed.\`);
        console.warn(\`   Check failed cases: \${failedCases.join(', ')}\`);
    }
    console.log("--------------------------------------------------");
} catch (e) {
    console.error("A critical error occurred in the test harness:", e.message);
}
`;
    };

    const handleSubmission = async () => {
        if (!userCode.trim()) {
            alert("Please provide a solution.");
            return;
        }

        const lang = challenge.language.toLowerCase();
        
        if (RUNNABLE_LANGUAGES.includes(lang)) {
            handleRunInSandbox();
        } else {
            handleSubmitForReview();
        }
    };

    const handleRunInSandbox = () => {
        const buildRunner = challenge.language === 'python' ? buildPythonTestRunner : buildJavaScriptTestRunner;
        const fullTestCode = buildRunner(userCode, challenge.test_cases);
        if (!fullTestCode) return;

        try {
            sessionStorage.setItem('sandbox_code', fullTestCode);
            sessionStorage.setItem('sandbox_user_code', userCode);
            sessionStorage.setItem('sandbox_language', challenge.language);
            
            window.open('/sandbox', '_blank');
            
            setSubmissionResult({
                success: null,
                message: "Your solution has been sent to the Sandbox for testing. Check the new tab for results!",
            });
        } catch (err) {
            console.error("Failed to send to sandbox:", err);
            setError("Could not open the sandbox runner.");
        }
    };

    const handleSubmitForReview = async () => {
        setIsSubmitting(true);
        setSubmissionResult(null);

        try {
            const submissionData = {
                challenge: challenge.id,
                submitted_code: userCode,
                language: challenge.language,
            };
            
            const newSubmission = await apiService.submitChallengeForReview(submissionData);
            setMySubmission(newSubmission);

            setSubmissionResult({
                success: true,
                message: "Your solution has been submitted successfully! An admin will review it soon.",
            });
        } catch (err) {
            console.error("Failed to submit for review:", err);
            const errorMessage = err.data?.detail || err.message || "Failed to submit your solution.";
            setSubmissionResult({ success: false, message: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className={styles.statusMessage}>Loading Challenge...</div>;
    if (error) return <div className={styles.statusMessage} style={{color: '#ff8e8e'}}>{error}</div>;
    if (!challenge) return <div className={styles.statusMessage}>Challenge not found.</div>;

    const isRunnable = challenge && RUNNABLE_LANGUAGES.includes(challenge.language.toLowerCase());

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

                <div className={styles.rightColumn}>
                    {isAuthenticated && <SubmissionStatus submission={mySubmission} />}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <Code size={20}/> Your Solution ({capitalize(challenge.language || '')})
                        </h2>
                        <textarea
                            className={styles.codeInput}
                            value={userCode}
                            onChange={(e) => setUserCode(e.target.value)}
                            placeholder={`Write your ${capitalize(challenge.language || '')} solution here...`}
                            rows={15}
                            disabled={isSubmitting || mySubmission?.status === 'approved'}
                        />
                        <button 
                            onClick={handleSubmission} 
                            className={styles.submitButton} 
                            disabled={isSubmitting || mySubmission?.status === 'approved'}>
                            <Upload size={18} />
                            {isSubmitting 
                                ? 'Submitting...' 
                                : mySubmission?.status === 'approved'
                                    ? 'Solution Approved!'
                                    : mySubmission
                                        ? 'Resubmit Solution'
                                        : isRunnable
                                            ? 'Submit & Run in Sandbox'
                                            : 'Submit for Review'
                            }
                        </button>
                    </div>
                   
                    {submissionResult && (
                         <div className={styles.section}>
                            <h2 className={styles.sectionTitle}><Terminal size={20}/> Result</h2>
                            <div className={`${styles.resultBox} ${submissionResult.success === true ? styles.success : submissionResult.success === false ? styles.failure : styles.info}`}>
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