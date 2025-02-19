import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/')}
      className="fixed top-24 left-4 md:left-8 z-50 flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors bg-surface/80 backdrop-blur-sm rounded-lg"
    >
      <FiArrowLeft />
      <span>Back to Home</span>
    </button>
  );
};

export default BackButton;
