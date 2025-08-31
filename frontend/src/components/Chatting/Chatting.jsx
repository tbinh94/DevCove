import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import styles from './Chatting.module.css';
import { Send, Search, MessageSquare, PlusCircle, X, Bot, Trash2 } from 'lucide-react'; 

const AI_USERNAME = process.env.REACT_APP_AI_ASSISTANT_USERNAME;

const stripHtml = (html) => {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, styles }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.modalBody}>
          <p>{message}</p>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

const NewChatModal = ({ users, onSelectUser, onClose, loading }) => {
    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h3>Start a New Chat</h3>
                    <button onClick={onClose} className={styles.closeButton}><X size={24} /></button>
                </div>
                <div className={styles.userList}>
                    {loading && <p>Loading users...</p>}
                    {!loading && users.map(user => (
                        <div 
                            key={user.id} 
                            className={`${styles.userListItem} ${user.username === AI_USERNAME ? styles.aiListItem : ''}`} 
                            onClick={() => onSelectUser(user.id)}
                        >
                            {user.username === AI_USERNAME ? (
                                <div className={`${styles.avatar} ${styles.aiAvatar}`}>
                                    <Bot size={24} />
                                </div>
                            ) : (
                                <img 
                                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                                    alt={user.username} 
                                    className={styles.avatar} 
                                />
                            )}
                            <span>{user.username}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Chatting = () => {
    const { user } = useAuth();
    const location = useLocation();
    
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [chatCandidates, setChatCandidates] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const confirmDelete = async () => {
        if (!activeConversation) return;

        const conversationToDeleteId = activeConversation.id;
        try {
            await apiService.deleteConversation(conversationToDeleteId);

            setActiveConversation(null);
            setMessages([]);
            setConversations(prev => 
                prev.filter(conv => conv.id !== conversationToDeleteId)
            );
        } catch (err) {
            console.error("Failed to delete conversation:", err);
            setError("Could not delete the conversation. Please try again.");
        } finally {
            setIsConfirmModalOpen(false); // Đóng modal
        }
    };

    // Helper function to format timestamp safely
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Now';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return 'Now';
        }
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper function to get other participant
    const getOtherParticipant = (participants) => {
        if (!user || !participants) return null;
        return participants.find(p => p.id !== user.id);
    };

    // Filter conversations based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredConversations(conversations);
        } else {
            const filtered = conversations.filter(conv => {
                const otherUser = getOtherParticipant(conv.participants);
                if (!otherUser) return false;
                
                const username = otherUser.username.toLowerCase();
                const query = searchQuery.toLowerCase().trim();
                
                return username.includes(query);
            });
            setFilteredConversations(filtered);
        }
    }, [conversations, searchQuery, user]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        setSearchQuery('');
    };

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                setLoading(true);
                const convos = await apiService.getConversations();
                setConversations(convos);
                
                const redirectedConvId = location.state?.conversationId;
                if (redirectedConvId) {
                    const foundConv = convos.find(c => c.id === redirectedConvId);
                    if (foundConv) {
                        setActiveConversation(foundConv);
                    }
                }
            } catch (err) {
                setError("Could not load conversations.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [location.state]);

    const connectWebSocket = (conversationId) => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const wsUrl = `ws://localhost:8000/ws/chat/${conversationId}/`; 
        
        console.log('Attempting to connect to WebSocket:', wsUrl);
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            console.log("WebSocket connected for conversation:", conversationId);
            setWsConnected(true);
            setError(null);
        };
        
        socket.onclose = (event) => {
            console.log("WebSocket disconnected:", event.code, event.reason);
            setWsConnected(false);
            if (event.code !== 1000 && activeConversation?.id === conversationId) {
                console.log("Attempting to reconnect in 3 seconds...");
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket(conversationId);
                }, 3000);
            }
        };
        
        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            setWsConnected(false);
            setError("Connection error. Messages may not send in real-time.");
        };
        
        socket.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                console.log("Received WebSocket message:", data);
                
                // Ensure the message has all required fields and normalize the structure
                const normalizedMessage = {
                    id: data.id || `temp_${Date.now()}`,
                    text: data.message || data.text,
                    sender: data.sender || { username: data.sender_username },
                    sender_username: data.sender_username || (data.sender ? data.sender.username : ''),
                    created_at: data.created_at || new Date().toISOString(),
                    conversation: data.conversation || activeConversation?.id
                };
                
                setMessages(prev => {
                    // Check if message already exists to prevent duplicates
                    const exists = prev.some(msg => 
                        (msg.id && msg.id === normalizedMessage.id) ||
                        (msg.text === normalizedMessage.text && 
                         msg.sender_username === normalizedMessage.sender_username &&
                         Math.abs(new Date(msg.created_at) - new Date(normalizedMessage.created_at)) < 1000)
                    );
                    
                    if (exists) {
                        return prev;
                    }
                    
                    return [...prev, normalizedMessage];
                });
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };
        
        ws.current = socket;
    };

    useEffect(() => {
        if (activeConversation) {
            const fetchMessagesAndConnect = async () => {
                try {
                    console.log("Fetching messages for conversation:", activeConversation.id);
                    const msgs = await apiService.getChatMessages(activeConversation.id);
                    setMessages(msgs);
                    connectWebSocket(activeConversation.id);
                } catch (err) {
                    console.error("Failed to fetch messages:", err);
                    setError("Failed to load messages.");
                }
            };

            fetchMessagesAndConnect();
        }

        return () => {
            if (ws.current) {
                console.log("Closing previous WebSocket connection.");
                ws.current.close(1000, "Changing conversation");
                ws.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            setWsConnected(false);
        };
    }, [activeConversation]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleNewChatClick = async () => {
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const candidates = await apiService.getChatCandidates();
            setChatCandidates(candidates);
        } catch (err) {
            console.error("Failed to load users for chat:", err);
            setError("Failed to load users for chat.");
        } finally {
            setModalLoading(false);
        }
    };

    const handleSelectUser = async (targetUserId) => {
        try {
            setIsModalOpen(false);
            const newConversation = await apiService.getOrCreateConversation(targetUserId);
            
            setConversations(prev => {
                const existing = prev.find(c => c.id === newConversation.id);
                return existing ? prev : [newConversation, ...prev];
            });
            
            setActiveConversation(newConversation);
        } catch (err) {
            console.error("Failed to start conversation:", err);
            setError("Failed to start conversation. Please try again.");
        }
    };
    
    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        if (!newMessage.trim()) return;
        
        const messageText = newMessage.trim();
        const otherUser = getOtherParticipant(activeConversation.participants);
        const isAIChat = otherUser?.username === AI_USERNAME;

        // --- AI CHAT LOGIC ---
        if (isAIChat) {
            // Optimistically add user's message to the UI
            const optimisticUserMessage = {
                id: `temp_${Date.now()}`,
                text: messageText,
                sender_username: user.username,
                created_at: new Date().toISOString(),
                conversation: activeConversation.id,
            };
            setMessages(prev => [...prev, optimisticUserMessage]);
            setNewMessage(''); // Clear input

            // Add a "typing" indicator for the AI
            const typingIndicator = {
                id: 'ai-typing',
                text: '...',
                sender_username: 'AI_Assistant',
                isTyping: true, // Custom flag
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, typingIndicator]);

            try {
                // Call the new backend endpoint for AI chat
                const aiResponse = await apiService.chatWithAI({
                    conversation_id: activeConversation.id,
                    text: messageText,
                });

                // Replace typing indicator with the actual AI response
                setMessages(prev => [
                    ...prev.filter(msg => !msg.isTyping), // Remove typing indicator
                    aiResponse // Add the real message from the AI
                ]);

            } catch (err) {
                console.error("Failed to get AI response:", err);
                setError("AI Assistant failed to respond. Please try again.");
                // Remove the "typing" indicator on error
                setMessages(prev => prev.filter(msg => !msg.isTyping));
            }
            return; // End execution here for AI chat
        }

        // --- EXISTING USER-TO-USER CHAT LOGIC (NO CHANGES NEEDED BELOW) ---
        setNewMessage(''); // Clear input immediately for better UX
        
        // Try WebSocket first
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify({ message: messageText }));
                return;
            } catch (err) {
                console.error("WebSocket send failed:", err);
            }
        }
        
        // Fallback to HTTP API if WebSocket fails
        try {
            console.log("Sending message via API fallback");
            const messageData = {
                text: messageText,
            };
            
            const sentMessage = await apiService.sendChatMessage(activeConversation.id, messageData);
            
            const normalizedMessage = {
                ...sentMessage,
                sender_username: sentMessage.sender ? sentMessage.sender.username : user.username,
                created_at: sentMessage.created_at || new Date().toISOString()
            };
            
            setMessages(prev => [...prev, normalizedMessage]);
            setError("Message sent (no real-time connection)");
        } catch (err) {
            console.error("Failed to send message via fallback:", err);
            setError("Failed to send message. Please try again.");
            setNewMessage(messageText);
        }
    };

    const handleDeleteConversation = () => {
        if (!activeConversation) return;
        setIsConfirmModalOpen(true);
    };


    if (loading) {
        return <div className={styles.centered}>Loading chats...</div>;
    }

    return (
        <div className={styles.chatContainer}>
            {/* Modal để bắt đầu cuộc trò chuyện mới */}
            {isModalOpen && (
                <NewChatModal 
                    users={chatCandidates}
                    onSelectUser={handleSelectUser}
                    onClose={() => setIsModalOpen(false)}
                    loading={modalLoading}
                />
            )}

            {/* Modal xác nhận xóa cuộc trò chuyện */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Conversation"
                message="Are you sure you want to permanently delete this entire conversation? This action cannot be undone."
                styles={styles} 
            />

            {/* Banner hiển thị lỗi */}
            {error && (
                <div className={styles.errorBanner}>
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* Sidebar chứa danh sách các cuộc trò chuyện */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarTitle}>
                        <h2>Chats</h2>
                        <button onClick={handleNewChatClick} className={styles.newChatButton}>
                            <PlusCircle size={22} />
                        </button>
                    </div>
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <input 
                            type="text" 
                            placeholder="Search chats..." 
                            className={styles.searchInput}
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        {searchQuery && (
                            <button 
                                onClick={clearSearch} 
                                className={styles.clearSearchButton}
                                type="button"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
                <ul className={styles.conversationList}>
                    {filteredConversations.length === 0 && searchQuery ? (
                        <li className={styles.noResults}>
                            <p>No chats found for "{searchQuery}"</p>
                        </li>
                    ) : (
                        filteredConversations.map(conv => {
                            const otherUser = getOtherParticipant(conv.participants);
                            if (!otherUser) return null;

                            const lastMessageRaw = conv.last_message ? conv.last_message.text : 'No messages yet.';
                            const lastMessageText = stripHtml(lastMessageRaw);

                            return (
                                <li 
                                    key={conv.id} 
                                    className={`${styles.conversationItem} ${activeConversation?.id === conv.id ? styles.active : ''}`}
                                    onClick={() => setActiveConversation(conv)}
                                >
                                    {otherUser.username === AI_USERNAME ? (
                                        <div className={`${styles.avatar} ${styles.aiAvatar}`}>
                                            <Bot size={24} />
                                        </div>
                                    ) : (
                                        <img 
                                            src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}&background=random`} 
                                            alt={otherUser.username} 
                                            className={styles.avatar} 
                                        />
                                    )}
                                    
                                    <div className={styles.conversationDetails}>
                                        <span className={styles.username}>{otherUser.username}</span>
                                        
                                        <span className={styles.lastMessage}>
                                            {lastMessageText.substring(0, 25) + (lastMessageText.length > 25 ? '...' : '')}
                                        </span>
                                    </div>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>

            {/* Khu vực hiển thị tin nhắn và nhập liệu */}
            <div className={styles.chatArea}>
                {activeConversation ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div>
                                <h3>{getOtherParticipant(activeConversation.participants)?.username}</h3>
                                {!wsConnected && <span className={styles.connectionStatus}>Reconnecting...</span>}
                            </div>
                            <div className={styles.chatHeaderActions}>
                                <Link to={`/profile/${getOtherParticipant(activeConversation.participants)?.username}`}>View Profile</Link>
                                <button 
                                    onClick={handleDeleteConversation} 
                                    className={styles.deleteButton}
                                    title="Delete Conversation"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.messageList}>
                            {messages.map((msg, index) => {
                                const senderUsername = msg.sender ? msg.sender.username : msg.sender_username;
                                const isSentByMe = senderUsername === user.username;
                                
                                return (
                                    <div 
                                        key={msg.id || `msg_${index}`}
                                        className={`${styles.messageBubble} ${isSentByMe ? styles.sent : styles.received} ${msg.isTyping ? styles.typing : ''}`}
                                    >
                                        <div className={styles.messageContent}>
                                            {senderUsername === AI_USERNAME ? (
                                                <div dangerouslySetInnerHTML={{ __html: msg.text || msg.message }} />
                                            ) : (
                                                <p>{msg.text || msg.message}</p>
                                            )}
                                            
                                            {!msg.isTyping && (
                                                <span className={styles.timestamp}>
                                                    {formatTimestamp(msg.created_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        <form className={styles.messageInputForm} onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={wsConnected ? "Type a message..." : "Type a message (no real-time connection)..."}
                                autoComplete="off"
                                disabled={!activeConversation}
                            />
                            <button type="submit" className={styles.sendButton} disabled={!newMessage.trim()}>
                                <Send size={20} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.noChatSelected}>
                        <MessageSquare size={64} />
                        <h2>Your Messages</h2>
                        <p>Select a conversation to start chatting, or start a new one.</p>
                        {searchQuery && (
                            <p>Search results for: "{searchQuery}"</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatting;