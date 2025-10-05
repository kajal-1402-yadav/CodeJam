import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

const InlineForm = ({ defaultValue = '', onSubmit, onCancel, placeholder, autoFocus = true }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue) {
      onSubmit(trimmedValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-purple-500 rounded outline-none text-gray-200"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <div className="flex items-center gap-1">
        <button
          type="submit"
          className="p-1 hover:bg-gray-700 rounded text-green-400"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-gray-700 rounded text-gray-400"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </form>
  );
};

export default InlineForm;