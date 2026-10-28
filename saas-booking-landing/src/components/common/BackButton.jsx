import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const BackButton = ({ label = 'Volver al inicio' }) => (
  <div className="max-w-4xl mx-auto px-4 mb-8">
    <Link to="/" className="hd-btn hd-btn-secondary py-2 text-sm">
      <FiArrowLeft aria-hidden="true" />
      <span>{label}</span>
    </Link>
  </div>
);

export default BackButton;
