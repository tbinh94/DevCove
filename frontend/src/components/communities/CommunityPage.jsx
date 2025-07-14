import React, { useState } from 'react';
import { Edit, Trash2, Calendar, User } from 'lucide-react';

const CommunityDetail = () => {
  // Sample data - in real app this would come from props or API
  const [community] = useState({
    slug: 'technology',
    description: 'A place to discuss the latest in technology, gadgets, and innovation.',
    owner: {
      username: 'techguru'
    },
    created_at: '2024-01-15T10:30:00Z'
  });

  const [posts] = useState([
    {
      id: 1,
      title: 'The Future of AI in Web Development',
      author: { username: 'developer123' }
    },
    {
      id: 2,
      title: 'React vs Vue: Which Framework to Choose in 2024?',
      author: { username: 'frontendpro' }
    },
    {
      id: 3,
      title: 'Building Scalable Applications with Node.js',
      author: { username: 'backendexpert' }
    }
  ]);

  const [currentUser] = useState({
    username: 'techguru' // Set to community owner for demo
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isOwner = currentUser.username === community.owner.username;

  const handleEdit = () => {
    console.log('Edit community');
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this community?')) {
      console.log('Delete community');
    }
  };

  const handlePostClick = (postId) => {
    console.log('Navigate to post:', postId);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          r/{community.slug}
        </h1>
        
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4 text-lg">
        {community.description}
      </p>

      {/* Community Info */}
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1">
          <User size={16} />
          <span>Created by <strong>{community.owner.username}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={16} />
          <span>on {formatDate(community.created_at)}</span>
        </div>
      </div>

      {/* Posts Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Posts in r/{community.slug}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {posts.length > 0 ? (
            posts.map((post, index) => (
              <div
                key={post.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handlePostClick(post.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-800">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-blue-600 hover:text-blue-800 font-medium mb-1 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      by {post.author.username}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4M7 16h10M3 4h18v16H3V4z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No posts yet in this community.</p>
              <p className="text-gray-400 text-sm mt-1">Be the first to share something!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;