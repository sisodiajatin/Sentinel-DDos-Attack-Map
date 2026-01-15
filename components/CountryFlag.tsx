import React from 'react';

interface CountryFlagProps {
  country: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Country name to ISO 3166-1 alpha-2 code mapping
const COUNTRY_CODES: Record<string, string> = {
  'USA': 'US',
  'United States': 'US',
  'China': 'CN',
  'Russia': 'RU',
  'Germany': 'DE',
  'UK': 'GB',
  'United Kingdom': 'GB',
  'France': 'FR',
  'Netherlands': 'NL',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Brazil': 'BR',
  'India': 'IN',
  'Australia': 'AU',
  'Singapore': 'SG',
  'Canada': 'CA',
  'Ukraine': 'UA',
  'Poland': 'PL',
  'Vietnam': 'VN',
  'Indonesia': 'ID',
  'Turkey': 'TR',
  'Mexico': 'MX',
  'Italy': 'IT',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Finland': 'FI',
  'Denmark': 'DK',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Belgium': 'BE',
  'Ireland': 'IE',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Czech Republic': 'CZ',
  'Romania': 'RO',
  'Hungary': 'HU',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  'Venezuela': 'VE',
  'Egypt': 'EG',
  'South Africa': 'ZA',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Morocco': 'MA',
  'Saudi Arabia': 'SA',
  'UAE': 'AE',
  'Israel': 'IL',
  'Iran': 'IR',
  'Pakistan': 'PK',
  'Bangladesh': 'BD',
  'Thailand': 'TH',
  'Malaysia': 'MY',
  'Philippines': 'PH',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
  'New Zealand': 'NZ',
};

const SIZE_CLASSES = {
  sm: 'w-4 h-3',
  md: 'w-5 h-4',
  lg: 'w-6 h-5',
};

const CountryFlag: React.FC<CountryFlagProps> = ({ country, size = 'sm', className = '' }) => {
  const code = COUNTRY_CODES[country] || country.slice(0, 2).toUpperCase();
  
  // Using flagcdn.com for flag images (free, no API key needed)
  const flagUrl = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
  
  return (
    <img
      src={flagUrl}
      alt={`${country} flag`}
      className={`${SIZE_CLASSES[size]} inline-block rounded-sm object-cover shadow-sm ${className}`}
      onError={(e) => {
        // Fallback to a placeholder if flag not found
        (e.target as HTMLImageElement).style.display = 'none';
      }}
      loading="lazy"
    />
  );
};

export default CountryFlag;
