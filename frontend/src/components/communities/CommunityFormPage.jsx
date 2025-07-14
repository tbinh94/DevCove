import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const CommunityFormPage = () => {
    const { slug } = useParams(); // Lấy slug nếu là trang edit
    const isEdit = Boolean(slug);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        if (isEdit) {
            // Nếu là trang edit, fetch dữ liệu community hiện tại
            console.log(`Fetching data for r/${slug}...`);
            // Giả lập: setFormData({ name: slug, description: 'An awesome community.' });
        }
    }, [isEdit, slug]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            console.log(`Updating community r/${slug} with:`, formData);
        } else {
            console.log('Creating new community:', formData);
        }
        navigate('/communities'); // Chuyển hướng sau khi submit
    };

    return (
        <div className="container mx-auto py-6 max-w-lg">
            <h1 className="text-2xl font-bold mb-4">
                {isEdit ? `Edit Community: r/${slug}` : 'Create New Community'}
            </h1> {/* */}
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="name">Name</label> {/* */}
                    <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="form-control"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="description">Description</label> {/* */}
                    <textarea
                        name="description"
                        id="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="form-control"
                    />
                </div>
                <button type="submit" className="btn btn-success">
                    {isEdit ? 'Update' : 'Create'}
                </button> {/* */}
                <Link to="/communities" className="btn btn-secondary ml-2">Cancel</Link> {/* */}
            </form>
        </div>
    );
};

export default CommunityFormPage;