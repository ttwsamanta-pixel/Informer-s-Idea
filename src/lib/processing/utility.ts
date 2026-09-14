export interface UtilitySettings {
  input: string;
  mode: string;
  count: number;
  unitFrom: string;
  unitTo: string;
  color: string;
}
export const defaultUtilitySettings: UtilitySettings = {
  input: '',
  mode: 'upper',
  count: 16,
  unitFrom: 'm',
  unitTo: 'cm',
  color: '#4936ff',
};
const units: Record<string, [string, number]> = {
  m: ['length', 1],
  cm: ['length', 0.01],
  mm: ['length', 0.001],
  km: ['length', 1000],
  in: ['length', 0.0254],
  ft: ['length', 0.3048],
  mi: ['length', 1609.344],
  kg: ['mass', 1],
  g: ['mass', 0.001],
  lb: ['mass', 0.45359237],
  oz: ['mass', 0.028349523125],
  c: ['temperature', 1],
  f: ['temperature', 1],
  k: ['temperature', 1],
};
export const unitOptions = Object.keys(units);
export function runUtility(operation: string, s: UtilitySettings) {
  const text = s.input;
  switch (operation) {
    case 'json':
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        throw new Error(
          'This JSON is not valid. Check quotes, commas, and brackets.',
        );
      }
    case 'encode':
      return btoa(
        Array.from(new TextEncoder().encode(text), (byte) =>
          String.fromCharCode(byte),
        ).join(''),
      );
    case 'decode':
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(
          Uint8Array.from(atob(text.replace(/\s/g, '')), (c) =>
            c.charCodeAt(0),
          ),
        );
      } catch {
        throw new Error('Enter valid Base64 containing UTF-8 text.');
      }
    case 'uuid':
      return Array.from({ length: Math.min(100, Math.max(1, s.count)) }, () =>
        crypto.randomUUID(),
      ).join('\n');
    case 'password': {
      const chars =
        'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_+=';
      const length = Math.min(128, Math.max(8, s.count));
      let out = '';
      const limit = 256 - (256 % chars.length);
      while (out.length < length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
        for (const b of bytes) {
          if (b < limit && out.length < length) out += chars[b % chars.length];
        }
      }
      return out;
    }
    case 'lorem':
      return Array.from(
        { length: Math.min(20, Math.max(1, s.count)) },
        () =>
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      ).join('\n\n');
    case 'count':
      return `Words: ${text.trim() ? text.trim().split(/\s+/u).length : 0}\nCharacters: ${Array.from(text).length}\nCharacters without whitespace: ${Array.from(text.replace(/\s/g, '')).length}\nLines: ${text ? text.split('\n').length : 0}`;
    case 'case':
      return s.mode === 'upper'
        ? text.toUpperCase()
        : s.mode === 'lower'
          ? text.toLowerCase()
          : text.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
    case 'color':
    case 'hex': {
      const hex = (operation === 'color' ? s.color : text)
        .trim()
        .replace('#', '');
      const full =
        hex.length === 3
          ? hex
              .split('')
              .map((c) => c + c)
              .join('')
          : hex;
      if (!/^[0-9a-f]{6}$/i.test(full))
        throw new Error('Enter a valid 3- or 6-digit HEX color.');
      return `#${full.toUpperCase()}\nrgb(${parseInt(full.slice(0, 2), 16)}, ${parseInt(full.slice(2, 4), 16)}, ${parseInt(full.slice(4, 6), 16)})`;
    }
    case 'rgb': {
      const values = text
        .replace(/rgb\(|\)/g, '')
        .split(',')
        .map((v) => Number(v.trim()));
      if (
        values.length !== 3 ||
        values.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
      )
        throw new Error(
          'Enter three values from 0 to 255, separated by commas.',
        );
      return (
        '#' +
        values
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
      );
    }
    case 'timestamp': {
      if (!text.trim())
        throw new Error('Enter a Unix timestamp or an ISO date.');
      const date = /^-?\d+(\.\d+)?$/.test(text.trim())
        ? new Date(Number(text) * (s.mode === 'milliseconds' ? 1 : 1000))
        : new Date(text);
      if (!Number.isFinite(date.getTime()))
        throw new Error(
          'Enter a valid timestamp or ISO date, such as 2026-01-01T00:00:00Z.',
        );
      return `UTC: ${date.toISOString()}\nLocal: ${date.toLocaleString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}`;
    }
    case 'unit': {
      if (!text.trim() || !Number.isFinite(Number(text)))
        throw new Error('Enter a valid number to convert.');
      const from = units[s.unitFrom],
        to = units[s.unitTo];
      if (from[0] !== to[0])
        throw new Error(
          'Select units of the same type (length, weight, or temperature).',
        );
      let value = Number(text);
      if (from[0] === 'temperature') {
        value =
          s.unitFrom === 'f'
            ? ((value - 32) * 5) / 9
            : s.unitFrom === 'k'
              ? value - 273.15
              : value;
        value =
          s.unitTo === 'f'
            ? (value * 9) / 5 + 32
            : s.unitTo === 'k'
              ? value + 273.15
              : value;
      } else value = (value * from[1]) / to[1];
      return `${text} ${s.unitFrom} = ${Number(value.toPrecision(12))} ${s.unitTo}`;
    }
    default:
      throw new Error('This operation is not supported.');
  }
}
