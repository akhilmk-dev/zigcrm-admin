import React, { useState, useEffect, useMemo } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
};

export const PhoneInput = ({
  label,
  error,
  touched,
  required,
  value,
  onChange,
  onBlur,
  name,
  country,
  onCountryChange,
}) => {
  const countries = useMemo(() => {
    return getCountries()
      .map(code => ({
        code,
        name: regionNames.of(code),
        callingCode: getCountryCallingCode(code)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const [selectedCountry, setSelectedCountry] = useState(country || 'US');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (country && country !== selectedCountry) {
      setSelectedCountry(country);
      const callingCode = getCountryCallingCode(country);
      if (!value || !value.startsWith('+')) {
        onChange({ target: { name, value: `+${callingCode}` } });
      }
    }
  }, [country]);

  useEffect(() => {
    if (value && value.startsWith('+')) {
      try {
        const phoneNumber = parsePhoneNumberFromString(value);
        if (phoneNumber?.country && phoneNumber.country !== selectedCountry) {
          setSelectedCountry(phoneNumber.country);
          if (onCountryChange) onCountryChange(phoneNumber.country);
        }
      } catch {}
    }
  }, [value]);

  const handleCountryChange = (e) => {
    const countryCode = e.target.value;
    setSelectedCountry(countryCode);
    if (onCountryChange) onCountryChange(countryCode);
    const callingCode = getCountryCallingCode(countryCode);
    if (!value || !value.startsWith('+')) {
      onChange({ target: { name, value: `+${callingCode}` } });
    } else {
      try {
        const phoneNumber = parsePhoneNumberFromString(value);
        const national = phoneNumber?.nationalNumber || '';
        onChange({ target: { name, value: `+${callingCode}${national}` } });
      } catch {
        onChange({ target: { name, value: `+${callingCode}` } });
      }
    }
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (val && !val.startsWith('+')) {
      val = '+' + val.replace(/\D/g, '');
    }
    onChange({ target: { name, value: val } });
  };

  const hasError = touched && error;
  const borderColor = hasError ? 'var(--danger)' : isFocused ? 'var(--primary)' : 'var(--border)';

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label}{required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div style={{
        display: 'flex',
        border: `1.5px solid ${borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isFocused && !hasError ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
      }}>
        {/* Country selector — overlay technique: visual div + transparent native select on top */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', borderRight: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`, backgroundColor: '#f8fafc', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 10px', pointerEvents: 'none', userSelect: 'none' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{getFlagEmoji(selectedCountry)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            title="Select country code"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', fontSize: '14px' }}
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.name} (+{c.callingCode})
              </option>
            ))}
          </select>
        </div>

        {/* Phone number input */}
        <input
          type="tel"
          name={name}
          value={value}
          onChange={handlePhoneChange}
          placeholder={`+${getCountryCallingCode(selectedCountry)} (555) 000-0000`}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: 'none',
            outline: 'none',
            fontSize: '14px',
            backgroundColor: 'transparent',
            color: 'var(--text-main)',
            minWidth: 0
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
        />
      </div>
      {hasError && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}
    </div>
  );
};
