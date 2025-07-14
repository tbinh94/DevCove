import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const CommunityConfirmDeletePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const handleDelete = (event) => {
    event.preventDefault();
    // Logic gọi API để xóa
    console.log(`Deleting community r/${slug}...`);
    // Sau khi xóa thành công, chuyển hướng người dùng
    // navigate('/communities');
    alert(`Community r/${slug} deleted!`);
  };

  return (
    <div className="container mx-auto py-6 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Delete Community</h1>
      <p>Are you sure you want to delete <strong>r/{slug}</strong>? This action cannot be undone.</p>
      <form onSubmit={handleDelete} className="mt-4">
        <button type="submit" className="btn btn-danger">Yes, delete</button>
        <Link to={`/r/${slug}`} className="btn btn-secondary ml-2">Cancel</Link>
      </form>
    </div>
  );
};

export default CommunityConfirmDeletePage;