import React, { useState } from 'react';

// Sidebar có thể tách thành component riêng vì nó tĩnh
const PostingGuideSidebar = () => (
    <aside className="sidebar">
        <div className="sidebar-card">
            <div className="sidebar-header">📋 Posting to Reddit</div> {/* */}
            <div className="sidebar-content">
                 <div className="sidebar-rule"><strong>1. Remember the human</strong></div> {/* */}
                 {/* ... các quy tắc khác */}
            </div>
        </div>
        {/* ... các card sidebar khác */}
    </aside>
);


const CreatePostPage = ({ isEdit = false }) => {
    const [postData, setPostData] = useState({
        title: '',
        content: '',
        image: null,
        community: '',
        tags: '',
    });
    const [postType, setPostType] = useState('text');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPostData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setPostData(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitting post:', postData);
        // Logic gọi API để tạo hoặc cập nhật bài đăng
    };

    return (
        <div className="main-container">
            <div className="post-container">
                <div className="post-header">
                    <h2 className="post-title">Create a post</h2> {/* */}
                    <div className="post-type-tabs">
                        {/* Các nút tabs có thể được làm động với onClick */}
                        <button className={`post-type-tab ${postType === 'text' ? 'active' : ''}`} onClick={() => setPostType('text')}>📝 Post</button> {/* */}
                        <button className={`post-type-tab ${postType === 'image' ? 'active' : ''}`} onClick={() => setPostType('image')}>🖼️ Images & Video</button> {/* */}
                        {/* ... các tabs khác */}
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="post-form">
                    <div className="mb-3">
                        <label htmlFor="title" className="form-label">Title *</label> {/* */}
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={postData.title}
                            onChange={handleInputChange}
                            className="form-control" // Giả sử có class này
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="content" className="form-label">Content</label> {/* */}
                        <textarea
                            id="content"
                            name="content"
                            value={postData.content}
                            onChange={handleInputChange}
                            className="form-control"
                        />
                    </div>
                    
                    {/* Các trường input khác cho image, community, tags... */}
                    
                    <div className="d-grid">
                        <button type="submit" className="btn btn-primary">
                            {isEdit ? 'Update Post' : 'Create Post'} {/* */}
                        </button>
                    </div>
                </form>
            </div>

            <PostingGuideSidebar />
        </div>
    );
};

export default CreatePostPage;