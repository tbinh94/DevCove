import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, Bot, User, MessageSquare, Code, Languages, Zap, FileText,
  AlertCircle, CheckCircle2, Minimize2, Maximize2, GitBranch, Shield, BookOpen, Search,
  Feather, Clipboard, PlayCircle, Layers, Terminal, Package, RefreshCw, Box, HelpCircle, Menu, Eye, EyeOff
} from 'lucide-react';
import styles from './BotChatInterface.module.css'; 

const BotChatInterface = ({
  isOpen,
  onClose,
  post,
  onSendMessage,
  isLoading = false,
  error = null,
  addBotResponse
}) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showQuickOptions, setShowQuickOptions] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const quickOptions = [
    {
      group: 'Giải thích Code',
      options: [
        { id: 'explain_code_flow', icon: <PlayCircle size={16} />, title: 'Giải thích luồng code', description: 'Giải thích ý tưởng và luồng chạy của đoạn code' },
      ]
    },
    {
      group: 'Tạo Code',
      options: [
        { id: 'generate_snippet', icon: <Code size={16} />, title: 'Tạo snippet mẫu', description: 'Tạo đoạn code mẫu cho chức năng cơ bản' },
      ]
    },
    {
      group: 'Sửa lỗi',
      options: [
        { id: 'debug_code', icon: <AlertCircle size={16} />, title: 'Tìm & sửa lỗi', description: 'Phân tích và sửa lỗi trong code' },
      ]
    },
    {
      group: 'Tối ưu hóa',
      options: [
        { id: 'optimize_performance', icon: <Zap size={16} />, title: 'Tối ưu hóa hiệu năng', description: 'Đề xuất cải thiện hiệu năng code' },
      ]
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [currentMessage]);

  const handleTextareaChange = (e) => {
    setCurrentMessage(e.target.value);
  };

  const handleSendCustomMessage = (e) => {
    e.preventDefault();
    if (currentMessage.trim()) {
      // Gửi tin nhắn tùy chỉnh với prompt_type là 'custom_analysis'
      onSendMessage(currentMessage.trim(), 'custom_analysis');
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: currentMessage.trim(), type: 'user', timestamp: new Date() },
      ]);
      setCurrentMessage('');
      setShowQuickOptions(false);
    }
  };

  const handleQuickOptionClick = (optionId, customPromptDetail = null) => {
    // Tìm mô tả của option để hiển thị cho người dùng
    let optionTitle = '';
    let optionDescription = '';
    for (const group of quickOptions) {
      const foundOption = group.options.find(opt => opt.id === optionId);
      if (foundOption) {
        optionTitle = foundOption.title;
        optionDescription = foundOption.description;
        break;
      }
    }

    // Các prompt đặc biệt cần thêm input từ người dùng
    const promptsNeedingInput = [
      'guide_library_usage', 
      'explain_cs_concept', 
      'generate_full_code', 
      'generate_snippet', 
      'translate_code', 
      'generate_comments_docs', 
      'ci_cd_integration'
    ];

    if (promptsNeedingInput.includes(optionId)) {
      const userInput = prompt(customPromptDetail || `Vui lòng nhập thêm thông tin chi tiết cho '${optionTitle}':`);
      if (!userInput) {
        return; // Người dùng hủy nhập
      }
      
      onSendMessage(userInput, optionId);
      
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `${optionTitle}: ${userInput}`, type: 'user', timestamp: new Date(), isQuickOption: true },
      ]);
    } else {
      onSendMessage('', optionId);
      
      // Hiển thị tin nhắn của người dùng
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: `Yêu cầu: ${optionTitle}`, type: 'user', timestamp: new Date(), isQuickOption: true },
      ]);
    }
    
    setShowQuickOptions(false);
  };

  // Hàm để thêm phản hồi từ bot (cần được gọi từ component cha hoặc nơi gửi yêu cầu API)
  useEffect(() => {
    if (addBotResponse) {
      const originalAddBotResponse = addBotResponse;
      addBotResponse = (responseText) => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: responseText, type: 'bot', timestamp: new Date(), showComment: true },
        ]);
        originalAddBotResponse(responseText); // Gọi lại hàm gốc nếu cần
      };
    }
  }, [addBotResponse]);


  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Hàm để ẩn/hiện comment của bot
  const toggleCommentVisibility = (index) => {
    setMessages(prevMessages => 
      prevMessages.map((msg, i) => 
        i === index ? { ...msg, showComment: !msg.showComment } : msg
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${isMinimized ? styles.minimizedOverlay : ''}`}>
      <div className={`${styles.chatContainer} ${isMinimized ? styles.minimizedChatContainer : styles.maximizedChatContainer} ${styles.animateFadeIn}`}>
        {isMinimized ? (
          <div className={styles.minimizedHeader} onClick={toggleMinimize}>
            <Bot size={20} />
            <span>DevAlly AI</span>
            <Maximize2 size={16} className={styles.minimizeMaximizeIcon} />
          </div>
        ) : (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitle}>
                <Bot size={20} className="mr-2" />
                DevAlly AI
              </div>
              <div className={styles.headerActions}>
                <button onClick={toggleMinimize} className={styles.iconButton}>
                  <Minimize2 size={18} />
                </button>
                <button onClick={onClose} className={styles.iconButton}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className={styles.chatBody}>
              <div className={styles.messagesContainer}>
                {messages.map((msg, index) => (
                  <div key={index} className={`${styles.messageWrapper} ${msg.type === 'user' ? styles.userWrapper : styles.botWrapper}`}>
                    {msg.type === 'bot' && (
                      <div className={styles.botAvatar}>
                        <Bot size={16} />
                      </div>
                    )}
                    <div className={`${styles.messageBubble} ${msg.type === 'user' ? styles.userMessage : styles.botMessage}`}>
                      {/* Render HTML content for bot messages */}
                      {msg.type === 'bot' ? (
                        <>
                          <div className={styles.botMessageContent} style={{ display: msg.showComment ? 'block' : 'none' }}>
                            <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                          </div>
                          <button 
                            onClick={() => toggleCommentVisibility(index)} 
                            className={styles.toggleCommentButton}
                            title={msg.showComment ? 'Ẩn bình luận' : 'Hiện bình luận'}
                          >
                            {msg.showComment ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </>
                      ) : (
                        msg.text
                      )}
                      <div className={styles.timestamp}>
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {showQuickOptions && (
                  <div className={styles.quickOptionsContainer}>
                    <div className={styles.quickOptionsHeader}>
                      <Bot size={18} />
                      <span className="font-semibold text-lg">Bạn muốn DevAlly làm gì?</span>
                    </div>
                    <div className={styles.quickOptionsGrid}>
                      {quickOptions.map((group, groupIndex) => (
                        <React.Fragment key={groupIndex}>
                          <div className={styles.quickOptionGroupTitle}>{group.group}</div>
                          {group.options.map((option) => (
                            <button
                              key={option.id}
                              className={styles.quickOptionButton}
                              onClick={() => handleQuickOptionClick(
                                option.id,
                                option.id === 'guide_library_usage' ? 'Nhập tên thư viện/framework/API bạn muốn hướng dẫn (ví dụ: React, Django REST Framework):' :
                                option.id === 'explain_cs_concept' ? 'Nhập tên khái niệm Khoa học Máy tính bạn muốn giải thích (ví dụ: Thuật toán Sắp xếp Nổi bọt, Lập trình hướng đối tượng):' :
                                option.id === 'generate_full_code' ? 'Nhập yêu cầu chi tiết cho đoạn code bạn muốn sinh (ví dụ: Tạo một API endpoint CRUD với Node.js và Express):' :
                                option.id === 'generate_snippet' ? 'Nhập tên chức năng mẫu bạn muốn tạo (ví dụ: Đăng nhập user, upload file, gửi email):' :
                                option.id === 'translate_code' ? 'Nhập ngôn ngữ đích bạn muốn dịch sang (ví dụ: Java sang Python, JS sang TypeScript):' :
                                option.id === 'generate_comments_docs' ? 'Bạn muốn tạo loại tài liệu nào? (ví dụ: comment cho hàm, tài liệu API Swagger, tóm tắt module):' :
                                option.id === 'ci_cd_integration' ? 'Bạn muốn cấu hình CI/CD cho nền tảng nào? (ví dụ: GitHub Actions, Heroku, Docker):' :
                                null
                              )}
                            >
                              <div className={styles.quickOptionIcon}>{option.icon}</div>
                              <div className={styles.quickOptionText}>
                                <div className={styles.quickOptionTitle}>{option.title}</div>
                                <div className={styles.quickOptionDesc}>{option.description}</div>
                              </div>
                            </button>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div className={styles.messageWrapper}>
                    <div className={styles.botAvatar}>
                      <Bot size={16} />
                    </div>
                    <div className={`${styles.botMessage} ${styles.loadingMessage}`}>
                      Đang phân tích
                      <div className={styles.loadingDots}>
                        <span>.</span><span>.</span><span>.</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className={styles.messageWrapper}>
                    <div className={styles.botAvatar}>
                      <AlertCircle size={18} className="text-white" />
                    </div>
                    <div className={`${styles.botMessage} ${styles.errorMessage}`}>
                      <div className={styles.errorHeader}>
                        <AlertCircle size={16} />
                        <span className={styles.errorTitle}>Đã xảy ra lỗi</span>
                      </div>
                      <p className={styles.errorText}>{error}</p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <div className={styles.inputAreaContainer}>
              <form onSubmit={handleSendCustomMessage} className={styles.inputForm}>
                <textarea
                  ref={textareaRef}
                  value={currentMessage}
                  onChange={handleTextareaChange}
                  placeholder="Gửi tin nhắn hoặc đặt câu hỏi tùy chỉnh..."
                  rows={1}
                  className={styles.textarea}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendCustomMessage(e);
                    }
                  }}
                />
                <div className={styles.inputFormActions}>
                  {!showQuickOptions && (
                    <button type="button" onClick={() => setShowQuickOptions(true)} className={styles.optionsButton}>
                      <Menu size={18} />
                    </button>
                  )}
                  <button type="submit" disabled={!currentMessage.trim() || isLoading} className={styles.sendButton}>
                    {isLoading ? <div className={styles.loadingSpinner}></div> : <Send size={16} />}
                  </button>
                </div>
              </form>


            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BotChatInterface;