import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Dữ liệu giả lập
const fakeCommunities = [
    { slug: 'reactjs', description: 'Everything about React.' },
    { slug: 'django', description: 'The web framework for perfectionists with deadlines.' },
];

const CommunityListPage = () => {
    const [communities, setCommunities] = useState([]);

    useEffect(() => {
        // Giả lập fetch API
        setCommunities(fakeCommunities);
    }, []);

    return (
        <div className="container mx-auto py-6">
            <h1 className="text-2xl font-bold mb-4">All Communities</h1> {/* */}
            <Link to="/communities/create" className="btn btn-primary mb-4">
                Create New Community
            </Link> {/* */}

            <ul className="list-disc pl-5">
                {communities.length > 0 ? (
                    communities.map(community => (
                        <li key={community.slug} className="mb-2">
                            <Link to={`/r/${community.slug}`} className="text-blue-600 hover:underline">
                                r/{community.slug}
                            </Link> {/* */}
                            &mdash; {community.description}
                        </li>
                    ))
                ) : (
                    <li>No communities yet. <Link to="/communities/create">Be the first!</Link></li> /* */
                )}
            </ul>
        </div>
    );
};

export default CommunityListPage;