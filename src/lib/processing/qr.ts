export interface QRSettings {
  content: string;
  ssid: string;
  password: string;
  security: string;
  name: string;
  phone: string;
  email: string;
  latitude: string;
  longitude: string;
  size: number;
  foreground: string;
  background: string;
  correction: 'L' | 'M' | 'Q' | 'H';
}
export const defaultQRSettings: QRSettings = {
  content: '',
  ssid: '',
  password: '',
  security: 'WPA',
  name: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  size: 512,
  foreground: '#11132b',
  background: '#ffffff',
  correction: 'M',
};
const escapeWiFi = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
const vcard = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, '\\$&')
    .replace(/\r/g, '');
export function qrPayload(operation: string, s: QRSettings) {
  switch (operation) {
    case 'wifi':
      if (!s.ssid.trim()) throw new Error('Enter a WiFi network name.');
      return `WIFI:T:${s.security};S:${escapeWiFi(s.ssid)};P:${s.security === 'nopass' ? '' : escapeWiFi(s.password)};;`;
    case 'url':
      try {
        const u = new URL(s.content);
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
        return u.href;
      } catch {
        throw new Error(
          'Enter a full website URL beginning with https:// or http://.',
        );
      }
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
        throw new Error('Enter a valid email address.');
      return `mailto:${s.email}?body=${encodeURIComponent(s.content)}`;
    case 'phone':
    case 'sms':
      if (!/^\+?[\d ()-]{5,25}$/.test(s.phone))
        throw new Error('Enter a valid phone number including country code.');
      return operation === 'phone'
        ? `tel:${s.phone.replace(/[^+\d]/g, '')}`
        : `SMSTO:${s.phone.replace(/[^+\d]/g, '')}:${s.content}`;
    case 'vcard':
      if (!s.name.trim()) throw new Error('Enter a contact name.');
      return `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${vcard(s.name)}\r\nTEL:${vcard(s.phone)}\r\nEMAIL:${vcard(s.email)}\r\nEND:VCARD`;
    case 'location':
      if (
        !s.latitude.trim() ||
        !s.longitude.trim() ||
        !Number.isFinite(Number(s.latitude)) ||
        !Number.isFinite(Number(s.longitude)) ||
        Math.abs(Number(s.latitude)) > 90 ||
        Math.abs(Number(s.longitude)) > 180
      )
        throw new Error(
          'Use a latitude between -90 and 90 and longitude between -180 and 180.',
        );
      return `geo:${Number(s.latitude)},${Number(s.longitude)}`;
    default:
      if (!s.content.trim())
        throw new Error('Enter some text or a link for your QR code.');
      return s.content;
  }
}
