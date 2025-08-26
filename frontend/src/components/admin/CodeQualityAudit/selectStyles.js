// selectStyles.js - Custom styles for React-Select component

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    background: 'rgba(51, 65, 85, 0.8)',
    border: state.isFocused ? '1px solid #4f46e5' : '1px solid rgba(71, 85, 105, 0.6)',
    borderRadius: '12px',
    padding: '0.375rem 0.5rem',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    boxShadow: state.isFocused 
      ? '0 0 0 3px rgba(79, 70, 229, 0.1), 0 4px 20px rgba(79, 70, 229, 0.2)' 
      : 'none',
    minHeight: '44px',
    '&:hover': {
      borderColor: state.isFocused ? '#4f46e5' : 'rgba(71, 85, 105, 0.8)',
    },
  }),

  menu: (provided) => ({
    ...provided,
    background: 'rgba(51, 65, 85, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '12px',
    border: '1px solid rgba(71, 85, 105, 0.3)',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    zIndex: 9999,
  }),

  option: (provided, state) => ({
    ...provided,
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: state.isSelected 
      ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' 
      : state.isFocused 
      ? 'rgba(79, 70, 229, 0.3)' 
      : 'transparent',
    color: state.isSelected 
      ? 'white' 
      : '#f1f5f9',
    '&:hover': {
      background: state.isSelected 
        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' 
        : 'rgba(79, 70, 229, 0.3)',
      color: state.isSelected ? 'white' : '#f1f5f9',
    },
  }),

  singleValue: (provided) => ({
    ...provided,
    color: '#f1f5f9',
    fontWeight: '500',
  }),

  input: (provided) => ({
    ...provided,
    color: '#f1f5f9',
  }),

  placeholder: (provided) => ({
    ...provided,
    color: '#64748b',
    fontWeight: '400',
  }),

  indicatorSeparator: (provided) => ({
    ...provided,
    display: 'none',
  }),

  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? '#f1f5f9' : '#94a3b8',
    padding: '0.5rem',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: '#f1f5f9',
    },
  }),

  clearIndicator: (provided, state) => ({
    ...provided,
    color: state.isFocused ? '#f1f5f9' : '#94a3b8',
    padding: '0.5rem',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: '#f87171',
    },
  }),

  loadingIndicator: (provided) => ({
    ...provided,
    color: '#4f46e5',
  }),

  noOptionsMessage: (provided) => ({
    ...provided,
    color: '#94a3b8',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
  }),

  loadingMessage: (provided) => ({
    ...provided,
    color: '#94a3b8',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
  }),
};

export default customSelectStyles;