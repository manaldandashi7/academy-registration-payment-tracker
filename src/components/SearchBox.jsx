import Icon from './Icons.jsx';
import { useLanguage } from '../i18n.jsx';

export { matchesSearch } from '../lib/search.js';

export default function SearchBox({ value, onChange, placeholder }) {
  const { t } = useLanguage();
  return (
    <div className="search-box">
      <Icon name="search" size={16} className="search-icon" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label={t('clear_search')}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
