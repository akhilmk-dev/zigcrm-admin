import React, { useState, useEffect, useMemo } from 'react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const PhoneInput = ({ 
  label, 
  error, 
  touched, 
  required, 
  value, 
  onChange, 
  onBlur, 
  name, 
  country, // Optional: controlled country code
  onCountryChange, // Optional: callback for country change
  ...props 
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

  // Sync internal country state with external country prop
  useEffect(() => {
    if (country && country !== selectedCountry) {
      setSelectedCountry(country);
      
      // If we switch country and phone is empty or doesn't match, update prefix
      const callingCode = getCountryCallingCode(country);
      if (!value || !value.startsWith('+')) {
        onChange({ target: { name, value: `+${callingCode}` } });
      }
    }
  }, [country]);

  // Sync internal country state with typed value
  useEffect(() => {
    if (value && value.startsWith('+')) {
      const phoneNumber = parsePhoneNumberFromString(value);
      if (phoneNumber && phoneNumber.country && phoneNumber.country !== selectedCountry) {
        setSelectedCountry(phoneNumber.country);
        if (onCountryChange) onCountryChange(phoneNumber.country);
      }
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
      const phoneNumber = parsePhoneNumberFromString(value);
      if (phoneNumber) {
        const nationalNumber = phoneNumber.nationalNumber;
        onChange({ target: { name, value: `+${callingCode}${nationalNumber}` } });
      } else {
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

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <select 
          value={selectedCountry}
          onChange={handleCountryChange}
          style={{
            width: '130px',
            padding: '10px 8px',
            borderRadius: 'var(--radius)',
            border: `1px solid ${touched && error ? 'var(--danger)' : 'var(--border)'}`,
            fontSize: '13px',
            outline: 'none',
            backgroundColor: '#fff',
            cursor: 'pointer'
          }}
        >
          {countries.map(c => (
            <option key={c.code} value={c.code}>
              {c.code} (+{c.callingCode})
            </option>
          ))}
        </select>
        <input 
          type="tel"
          name={name}
          value={value}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          placeholder="+1 (555) 000-0000"
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 'var(--radius)',
            border: `1px solid ${touched && error ? 'var(--danger)' : 'var(--border)'}`,
            fontSize: '14px',
            outline: 'none',
            backgroundColor: '#fff',
            transition: 'border-color 0.2s'
          }}
          onFocus={(e) => {
            if (!(touched && error)) e.target.style.borderColor = 'var(--primary)';
          }}
          onBlur={(e) => {
            if (!(touched && error)) e.target.style.borderColor = 'var(--border)';
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
      </div>
      {touched && error && (
        <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>{error}</div>
      )}
    </div>
  );
};
