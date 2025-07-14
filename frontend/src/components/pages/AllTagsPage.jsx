import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Dữ liệu giả lập
const fakeTags = [
    { slug: 'react', name: 'react', post_count: 150 },
    { slug: 'javascript', name: 'javascript', post_count: 200 },
    { slug: 'css', name: 'css', post_count: 95 },
    { slug: 'python-django', name: 'python-django', post_count: 120 },
];

const AllTagsPage = () => {
    const [tags, setTags] = useState([]);

    useEffect(() => {
        // Gọi API để lấy tags ở đây
        setTags(fakeTags);
    }, []);

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">All Tags</h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tags.length > 0 ? (
                    tags.map(tag => (
                        <Link 
                            key={tag.slug} 
                            to={`/t/${tag.slug}`} 
                            className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-blue-600 hover:underline">#{tag.name}</span>
                                <span className="text-xs text-gray-500">{tag.post_count} posts</span>
                            </div>
                        </Link>
                    ))
                ) : (
                    <p className="col-span-full text-gray-600">No tags available.</p>
                )}
            </div>
            {/* Component Pagination có thể được thêm vào đây */}
        </div>
    );
};

export default AllTagsPage;