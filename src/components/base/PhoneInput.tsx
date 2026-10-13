import { useEffect, useRef, useState } from 'react';
import CountryCodeSelect from '@/components/feature/CountryCodeSelect';
import { combinePhone, splitPhone, DEFAULT_DIAL_CODE } from '@/lib/dialCodes';

/**
 * Country-code picker + national number field, for state-driven CRM forms.
 *
 * It reads and writes a single combined string (e.g. "+254 712 345 678") so the
 * value maps straight onto the existing phone column — no schema change. When an
 * existing record is loaded it splits the stored value back into the dial code
 * and the local number so the picker is pre-filled.
 *
 * The tel input and the picker button take explicit classNames so the control
 * can adopt each form's own field styling (border colour, radius, height).
 */
interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultCode?: string;
  placeholder?: string;
  /** Classes for the number <input> (should include border/rounding/padding). */
  inputClassName: string;
  /** Classes for the dial-code button. */
  buttonClassName: string;
  /** Optional classes for the dropdown panel. */
  dropdownClassName?: string;
  /** Disables both the picker and the number field. */
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  defaultCode = DEFAULT_DIAL_CODE,
  placeholder,
  inputClassName,
  buttonClassName,
  dropdownClassName,
  disabled = false,
}: PhoneInputProps) {
  const initial = splitPhone(value, defaultCode);
  const [code, setCode] = useState(initial.code);
  const [national, setNational] = useState(initial.national);
  // Tracks the last value we emitted so an external value change (e.g. loading a
  // different record) re-splits the field, but our own edits don't re-format mid-typing.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const parsed = splitPhone(value, defaultCode);
    setCode(parsed.code);
    setNational(parsed.national);
    lastEmitted.current = value;
  }, [value, defaultCode]);

  const emit = (nextCode: string, nextNational: string) => {
    const combined = combinePhone(nextCode, nextNational);
    lastEmitted.current = combined;
    onChange(combined);
  };

  return (
    <div className="flex">
      <CountryCodeSelect
        value={code}
        onChange={(c) => {
          setCode(c);
          emit(c, national);
        }}
        buttonClassName={buttonClassName}
        dropdownClassName={dropdownClassName}
        disabled={disabled}
      />
      <input
        type="tel"
        value={national}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          setNational(v);
          emit(code, v);
        }}
        placeholder={placeholder}
        className={`${inputClassName}${disabled ? ' opacity-60 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}