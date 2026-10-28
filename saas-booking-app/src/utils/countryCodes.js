// Calling codes offered in the phone fields, with Spanish and English names.
export const COUNTRY_CODES = [
  { code: '+1', name: 'EE. UU./Canadá', nameEn: 'USA/Canada' },
  { code: '+54', name: 'Argentina', nameEn: 'Argentina' },
  { code: '+61', name: 'Australia', nameEn: 'Australia' },
  { code: '+43', name: 'Austria', nameEn: 'Austria' },
  { code: '+973', name: 'Baréin', nameEn: 'Bahrain' },
  { code: '+880', name: 'Bangladesh', nameEn: 'Bangladesh' },
  { code: '+32', name: 'Bélgica', nameEn: 'Belgium' },
  { code: '+591', name: 'Bolivia', nameEn: 'Bolivia' },
  { code: '+55', name: 'Brasil', nameEn: 'Brazil' },
  { code: '+56', name: 'Chile', nameEn: 'Chile' },
  { code: '+86', name: 'China', nameEn: 'China' },
  { code: '+57', name: 'Colombia', nameEn: 'Colombia' },
  { code: '+506', name: 'Costa Rica', nameEn: 'Costa Rica' },
  { code: '+53', name: 'Cuba', nameEn: 'Cuba' },
  { code: '+45', name: 'Dinamarca', nameEn: 'Denmark' },
  { code: '+20', name: 'Egipto', nameEn: 'Egypt' },
  { code: '+503', name: 'El Salvador', nameEn: 'El Salvador' },
  { code: '+33', name: 'Francia', nameEn: 'France' },
  { code: '+49', name: 'Alemania', nameEn: 'Germany' },
  { code: '+30', name: 'Grecia', nameEn: 'Greece' },
  { code: '+502', name: 'Guatemala', nameEn: 'Guatemala' },
  { code: '+509', name: 'Haití', nameEn: 'Haiti' },
  { code: '+504', name: 'Honduras', nameEn: 'Honduras' },
  { code: '+852', name: 'Hong Kong', nameEn: 'Hong Kong' },
  { code: '+91', name: 'India', nameEn: 'India' },
  { code: '+62', name: 'Indonesia', nameEn: 'Indonesia' },
  { code: '+353', name: 'Irlanda', nameEn: 'Ireland' },
  { code: '+972', name: 'Israel', nameEn: 'Israel' },
  { code: '+39', name: 'Italia', nameEn: 'Italy' },
  { code: '+81', name: 'Japón', nameEn: 'Japan' },
  { code: '+962', name: 'Jordania', nameEn: 'Jordan' },
  { code: '+7', name: 'Kazajistán/Rusia', nameEn: 'Kazakhstan/Russia' },
  { code: '+254', name: 'Kenia', nameEn: 'Kenya' },
  { code: '+965', name: 'Kuwait', nameEn: 'Kuwait' },
  { code: '+996', name: 'Kirguistán', nameEn: 'Kyrgyzstan' },
  { code: '+856', name: 'Laos', nameEn: 'Laos' },
  { code: '+52', name: 'México', nameEn: 'Mexico' },
  { code: '+377', name: 'Mónaco', nameEn: 'Monaco' },
  { code: '+212', name: 'Marruecos', nameEn: 'Morocco' },
  { code: '+258', name: 'Mozambique', nameEn: 'Mozambique' },
  { code: '+31', name: 'Países Bajos', nameEn: 'Netherlands' },
  { code: '+64', name: 'Nueva Zelanda', nameEn: 'New Zealand' },
  { code: '+505', name: 'Nicaragua', nameEn: 'Nicaragua' },
  { code: '+234', name: 'Nigeria', nameEn: 'Nigeria' },
  { code: '+47', name: 'Noruega', nameEn: 'Norway' },
  { code: '+968', name: 'Omán', nameEn: 'Oman' },
  { code: '+92', name: 'Pakistán', nameEn: 'Pakistan' },
  { code: '+507', name: 'Panamá', nameEn: 'Panama' },
  { code: '+595', name: 'Paraguay', nameEn: 'Paraguay' },
  { code: '+51', name: 'Perú', nameEn: 'Peru' },
  { code: '+63', name: 'Filipinas', nameEn: 'Philippines' },
  { code: '+48', name: 'Polonia', nameEn: 'Poland' },
  { code: '+351', name: 'Portugal', nameEn: 'Portugal' },
  { code: '+974', name: 'Catar', nameEn: 'Qatar' },
  { code: '+40', name: 'Rumania', nameEn: 'Romania' },
  { code: '+966', name: 'Arabia Saudita', nameEn: 'Saudi Arabia' },
  { code: '+221', name: 'Senegal', nameEn: 'Senegal' },
  { code: '+65', name: 'Singapur', nameEn: 'Singapore' },
  { code: '+27', name: 'Sudáfrica', nameEn: 'South Africa' },
  { code: '+82', name: 'Corea del Sur', nameEn: 'South Korea' },
  { code: '+34', name: 'España', nameEn: 'Spain' },
  { code: '+94', name: 'Sri Lanka', nameEn: 'Sri Lanka' },
  { code: '+46', name: 'Suecia', nameEn: 'Sweden' },
  { code: '+41', name: 'Suiza', nameEn: 'Switzerland' },
  { code: '+886', name: 'Taiwán', nameEn: 'Taiwan' },
  { code: '+66', name: 'Tailandia', nameEn: 'Thailand' },
  { code: '+90', name: 'Turquía', nameEn: 'Turkey' },
  { code: '+971', name: 'Emiratos Árabes Unidos', nameEn: 'UAE' },
  { code: '+44', name: 'Reino Unido', nameEn: 'UK' },
  { code: '+598', name: 'Uruguay', nameEn: 'Uruguay' },
  { code: '+998', name: 'Uzbekistán', nameEn: 'Uzbekistan' },
  { code: '+58', name: 'Venezuela', nameEn: 'Venezuela' },
  { code: '+84', name: 'Vietnam', nameEn: 'Vietnam' }
];

// The list in a language ('es' or 'en'), sorted by name.
export const countryOptions = (language = 'es') => COUNTRY_CODES
  .map(({ code, name, nameEn }) => ({ code, name: language === 'en' ? nameEn : name }))
  .sort((a, b) => a.name.localeCompare(b.name, language));

// Country code + local number -> E.164 ("+50688887777"), or null when empty.
export const toE164 = (countryCode, localNumber) => {
  const digits = String(localNumber || '').replace(/[^0-9]/g, '');
  return digits ? `${countryCode}${digits}` : null;
};

// Same rule as the API: "+", a country code and 8 to 15 digits in all.
export const isE164 = (phone) => /^\+[1-9]\d{7,14}$/.test(phone);

// The business's time zone says where most of its clients call from, so the
// phone field starts on that country instead of always on +1.
const CODE_BY_TIME_ZONE = {
  'America/Costa_Rica': '+506', 'America/Panama': '+507', 'America/Managua': '+505',
  'America/Tegucigalpa': '+504', 'America/El_Salvador': '+503', 'America/Guatemala': '+502',
  'America/Mexico_City': '+52', 'America/Cancun': '+52', 'America/Monterrey': '+52',
  'America/Merida': '+52', 'America/Chihuahua': '+52', 'America/Tijuana': '+52',
  'America/Hermosillo': '+52', 'America/Mazatlan': '+52',
  'America/Bogota': '+57', 'America/Lima': '+51', 'America/Caracas': '+58',
  'America/La_Paz': '+591', 'America/Santiago': '+56', 'America/Asuncion': '+595',
  'America/Montevideo': '+598', 'America/Argentina/Buenos_Aires': '+54', 'America/Buenos_Aires': '+54',
  'America/Sao_Paulo': '+55', 'America/Havana': '+53', 'America/Port-au-Prince': '+509',
  'Europe/Madrid': '+34', 'Europe/London': '+44', 'Europe/Dublin': '+353', 'Europe/Paris': '+33',
  'Europe/Berlin': '+49', 'Europe/Rome': '+39', 'Europe/Lisbon': '+351', 'Europe/Amsterdam': '+31',
  'Europe/Brussels': '+32', 'Europe/Vienna': '+43', 'Europe/Zurich': '+41', 'Europe/Stockholm': '+46',
  'Europe/Oslo': '+47', 'Europe/Copenhagen': '+45', 'Europe/Warsaw': '+48', 'Europe/Athens': '+30',
  'Europe/Bucharest': '+40', 'Europe/Istanbul': '+90', 'Europe/Moscow': '+7', 'Europe/Monaco': '+377',
  'Asia/Tokyo': '+81', 'Asia/Seoul': '+82', 'Asia/Shanghai': '+86', 'Asia/Hong_Kong': '+852',
  'Asia/Taipei': '+886', 'Asia/Singapore': '+65', 'Asia/Bangkok': '+66', 'Asia/Jakarta': '+62',
  'Asia/Manila': '+63', 'Asia/Kolkata': '+91', 'Asia/Calcutta': '+91', 'Asia/Dubai': '+971',
  'Asia/Riyadh': '+966', 'Asia/Qatar': '+974', 'Asia/Kuwait': '+965', 'Asia/Bahrain': '+973',
  'Asia/Muscat': '+968', 'Asia/Amman': '+962', 'Asia/Jerusalem': '+972', 'Asia/Karachi': '+92',
  'Asia/Dhaka': '+880', 'Asia/Colombo': '+94', 'Asia/Ho_Chi_Minh': '+84', 'Asia/Vientiane': '+856',
  'Asia/Tashkent': '+998', 'Asia/Bishkek': '+996', 'Asia/Almaty': '+7',
  'Australia/Sydney': '+61', 'Australia/Melbourne': '+61', 'Australia/Brisbane': '+61',
  'Australia/Perth': '+61', 'Australia/Adelaide': '+61', 'Pacific/Auckland': '+64',
  'Africa/Cairo': '+20', 'Africa/Lagos': '+234', 'Africa/Nairobi': '+254', 'Africa/Johannesburg': '+27',
  'Africa/Casablanca': '+212', 'Africa/Dakar': '+221', 'Africa/Maputo': '+258',
};

export const defaultCountryCode = (timeZone) => CODE_BY_TIME_ZONE[timeZone] || '+1';
