import React, { useState, useEffect, useRef } from 'react';

const UserDropdown = ({ userGreeting, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`user-menu ${isOpen ? 'open' : ''}`}>
      <div 
        className="user-greeting"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        {userGreeting}
      </div>
      {isOpen && (
        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
};
export default UserDropdown;