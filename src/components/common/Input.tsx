import React, { useState, useId } from 'react';

interface InputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  icon,
  placeholder,
  required = false,
  disabled = false,
  multiline = false,
  rows = 4,
  className = '',
}) => {
  const [focused, setFocused] = useState(false);
  const id = useId();

  const isFloating = focused || value.length > 0;

  const wrapperClasses = [
    'input-wrapper',
    focused ? 'input-wrapper--focused' : '',
    error ? 'input-wrapper--error' : '',
    disabled ? 'input-wrapper--disabled' : '',
    isFloating ? 'input-wrapper--floating' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sharedProps = {
    id,
    value,
    placeholder: focused ? placeholder : undefined,
    required,
    disabled,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    className: 'input-field',
  };

  return (
    <div className={wrapperClasses}>
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        {multiline ? (
          <textarea {...sharedProps} rows={rows} />
        ) : (
          <input {...sharedProps} type={type} />
        )}
        <label htmlFor={id} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

export default Input;
