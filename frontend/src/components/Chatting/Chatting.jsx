import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import styles from './Chatting.module.css';
import { Send, Search, MessageSquare, PlusCircle, X } from 'lucide-react';

const NewChatModal = ({ users, onSelectUser, onClose, loading }) => {
    // ... (Không thay đổi component này)
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
                        <div key={user.id} className={styles.userListItem} onClick={() => onSelectUser(user.id)}>
                            <img 
                                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                                alt={user.username} 
                                className={styles.avatar} 
                            />
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

    // === SỬA LỖI TẠI ĐÂY: Logic kết nối và dọn dẹp được đơn giản hóa ===

    // Hàm này CHỈ tạo kết nối mới, không dọn dẹp cái cũ.
    const connectWebSocket = (conversationId) => {
        // Clear bất kỳ timeout nào đang chờ kết nối lại
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        //const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        //const wsUrl = `${protocol}//${window.location.host}/ws/chat/${conversationId}/`;
        
        // Kết nối thẳng đến backend Django ở cổng 8000 (hoặc cổng bạn đang chạy)
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
                setMessages(prev => [...prev, data]);
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };
        
        ws.current = socket; // Gán socket mới vào ref
    };

    useEffect(() => {
        if (activeConversation) {
            const fetchMessagesAndConnect = async () => {
                try {
                    console.log("Fetching messages for conversation:", activeConversation.id);
                    const msgs = await apiService.getChatMessages(activeConversation.id);
                    setMessages(msgs);
                    // Kết nối WebSocket NGAY LẬP TỨC sau khi tải tin nhắn xong
                    connectWebSocket(activeConversation.id);
                } catch (err) {
                    console.error("Failed to fetch messages:", err);
                    setError("Failed to load messages.");
                }
            };

            fetchMessagesAndConnect();
        }

        // Cleanup function: Đây là nơi DUY NHẤT để đóng kết nối cũ.
        // Nó sẽ chạy mỗi khi activeConversation thay đổi, TRƯỚC khi effect mới được chạy.
        return () => {
            if (ws.current) {
                console.log("Closing previous WebSocket connection.");
                ws.current.close(1000, "Changing conversation"); // Mã 1000 là đóng bình thường
                ws.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            setWsConnected(false);
        };
    }, [activeConversation]); // Chỉ phụ thuộc vào activeConversation
    
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
    
    // ... (handleSendMessage và phần còn lại của component không đổi)
    const handleSendMessage = async (e) => {
        e.preventDefault();
        
        if (!newMessage.trim()) return;
        
        // Try WebSocket first
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            try {
                ws.current.send(JSON.stringify({ message: newMessage }));
                setNewMessage('');
                return;
            } catch (err) {
                console.error("WebSocket send failed:", err);
            }
        }
        
        // Fallback to HTTP API if WebSocket fails
        try {
            console.log("Sending message via API fallback");
            const messageData = {
                text: newMessage,
            };
            
            const sentMessage = await apiService.sendChatMessage(activeConversation.id, messageData);
            setMessages(prev => [...prev, sentMessage]);
            setNewMessage('');
            setError("Message sent (no real-time connection)");
        } catch (err) {
            console.error("Failed to send message via fallback:", err);
            setError("Failed to send message. Please try again.");
        }
    };

    const getOtherParticipant = (participants) => {
        if (!user || !participants) return null;
        return participants.find(p => p.id !== user.id);
    };

    if (loading) {
        return <div className={styles.centered}>Loading chats...</div>;
    }

    return (
        <div className={styles.chatContainer}>
            {isModalOpen && (
                <NewChatModal 
                    users={chatCandidates}
                    onSelectUser={handleSelectUser}
                    onClose={() => setIsModalOpen(false)}
                    loading={modalLoading}
                />
            )}

            {error && (
                <div className={styles.errorBanner}>
                    {error}
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

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
                        <input type="text" placeholder="Search chats..." className={styles.searchInput} />
                    </div>
                </div>
                <ul className={styles.conversationList}>
                    {conversations.map(conv => {
                        const otherUser = getOtherParticipant(conv.participants);
                        if (!otherUser) return null;
                        return (
                            <li 
                                key={conv.id} 
                                className={`${styles.conversationItem} ${activeConversation?.id === conv.id ? styles.active : ''}`}
                                onClick={() => setActiveConversation(conv)}
                            >
                                <img 
                                    src={otherUser.avatar_url || `https://ui-avatars.com/api/?name=${otherUser.username}&background=random`} 
                                    alt={otherUser.username} 
                                    className={styles.avatar} 
                                />
                                <div className={styles.conversationDetails}>
                                    <span className={styles.username}>{otherUser.username}</span>
                                    <span className={styles.lastMessage}>
                                        {conv.last_message ? conv.last_message.text.substring(0, 25) + (conv.last_message.text.length > 25 ? '...' : '') : 'No messages yet.'}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className={styles.chatArea}>
                {activeConversation ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div>
                                <h3>{getOtherParticipant(activeConversation.participants)?.username}</h3>
                                {!wsConnected && <span className={styles.connectionStatus}>Reconnecting...</span>}
                            </div>
                            <Link to={`/profile/${getOtherParticipant(activeConversation.participants)?.username}`}>View Profile</Link>
                        </div>
                        <div className={styles.messageList}>
                            {messages.map((msg, index) => {
                                const senderUsername = msg.sender ? msg.sender.username : msg.sender_username;
                                const isSentByMe = senderUsername === user.username;
                                return (
                                    <div 
                                        key={msg.id || index}
                                        className={`${styles.messageBubble} ${isSentByMe ? styles.sent : styles.received}`}
                                    >
                                        <div className={styles.messageContent}>
                                            <p>{msg.text || msg.message}</p>
                                            <span className={styles.timestamp}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default Chatting;