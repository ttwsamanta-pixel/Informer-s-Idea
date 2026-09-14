'use client';
import { useState } from 'react';
import { QrCode, Download } from 'lucide-react';
import type { ToolDefinition } from '@/types/tools';
import {
  defaultQRSettings,
  qrPayload,
  type QRSettings,
} from '@/lib/processing/qr';
import { download } from '@/lib/processing/files';
import { Field, ErrorMessage, PrivacyNotice } from './shared';
export default function QRWorkspace({ tool }: { tool: ToolDefinition }) {
  const [settings, setSettings] = useState(defaultQRSettings);
  const [png, setPng] = useState('');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = <K extends keyof QRSettings>(k: K, v: QRSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setPng('');
    setSvg('');
  };
  const op = tool.operation;
  const field = (
    label: string,
    key:
      | 'content'
      | 'ssid'
      | 'password'
      | 'name'
      | 'phone'
      | 'email'
      | 'latitude'
      | 'longitude',
    type = 'text',
  ) => (
    <Field label={label}>
      <input
        type={type}
        value={settings[key]}
        onChange={(e) => update(key, e.target.value)}
      />
    </Field>
  );
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>Your QR code</h2>
        <div className="qr-preview">
          {png ? (
            <img src={png} alt="Generated QR code" />
          ) : (
            <div className="empty-state" style={{ border: 0 }}>
              <QrCode size={52} />
              <h3>A scan away from something useful.</h3>
              <p>Add your details, then generate your code.</p>
            </div>
          )}
        </div>
        {png && (
          <div className="result-actions">
            <button
              className="button primary"
              onClick={async () => {
                const blob = await (await fetch(png)).blob();
                download(blob, 'qr-code.png');
              }}
            >
              <Download size={15} />
              Download PNG
            </button>
            <button
              className="button secondary"
              onClick={() =>
                download(
                  new Blob([svg], { type: 'image/svg+xml' }),
                  'qr-code.svg',
                )
              }
            >
              Download SVG
            </button>
          </div>
        )}
        <PrivacyNotice />
        <ErrorMessage message={error} />
        <p className="tool-note">
          Use a dark foreground on a light background and test scanning before
          printing. Your QR code has no expiry and no tracking redirect.
        </p>
      </div>
      <div className="workspace-card">
        <h2>Make it your own</h2>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          {op === 'wifi' ? (
            <>
              {field('Network name (SSID)', 'ssid')}
              {field('WiFi password', 'password', 'password')}
              <Field label="Security">
                <select
                  value={settings.security}
                  onChange={(e) => update('security', e.target.value)}
                >
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open network</option>
                </select>
              </Field>
            </>
          ) : op === 'vcard' ? (
            <>
              {field('Full name', 'name')}
              {field('Phone number', 'phone')}
              {field('Email address', 'email', 'email')}
            </>
          ) : op === 'location' ? (
            <>
              {field('Latitude', 'latitude')}
              {field('Longitude', 'longitude')}
            </>
          ) : (
            <>
              {['phone', 'sms'].includes(op) && field('Phone number', 'phone')}
              {op === 'email' && field('Email address', 'email', 'email')}
              {op !== 'phone' && (
                <Field
                  label={
                    op === 'url'
                      ? 'Website URL'
                      : op === 'email' || op === 'sms'
                        ? 'Message'
                        : 'Text or website URL'
                  }
                >
                  <textarea
                    rows={4}
                    value={settings.content}
                    onChange={(e) => update('content', e.target.value)}
                    placeholder={
                      op === 'url'
                        ? 'https://example.com'
                        : 'Enter your content…'
                    }
                  />
                </Field>
              )}
            </>
          )}
          <div className="field-row">
            <Field label="Foreground">
              <input
                type="color"
                value={settings.foreground}
                onChange={(e) => update('foreground', e.target.value)}
              />
            </Field>
            <Field label="Background">
              <input
                type="color"
                value={settings.background}
                onChange={(e) => update('background', e.target.value)}
              />
            </Field>
          </div>
          <div className="field-row">
            <Field label="PNG size">
              <select
                value={settings.size}
                onChange={(e) => update('size', Number(e.target.value))}
              >
                <option value={256}>256 px</option>
                <option value={512}>512 px</option>
                <option value={1024}>1024 px</option>
                <option value={2048}>2048 px</option>
              </select>
            </Field>
            <Field label="Error correction">
              <select
                value={settings.correction}
                onChange={(e) =>
                  update(
                    'correction',
                    e.target.value as QRSettings['correction'],
                  )
                }
              >
                <option value="L">Low (7%)</option>
                <option value="M">Medium (15%)</option>
                <option value="Q">Quartile (25%)</option>
                <option value="H">High (30%)</option>
              </select>
            </Field>
          </div>
          <button
            className="button primary full-width"
            disabled={busy}
            onClick={async () => {
              setError('');
              setBusy(true);
              try {
                const payload = qrPayload(op, settings);
                const QR = await import('qrcode');
                const options = {
                  width: settings.size,
                  margin: 4,
                  errorCorrectionLevel: settings.correction,
                  color: {
                    dark: settings.foreground,
                    light: settings.background,
                  },
                };
                setPng(await QR.toDataURL(payload, options));
                setSvg(await QR.toString(payload, { ...options, type: 'svg' }));
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : 'Could not generate your QR code. Try shorter content.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Generating…' : 'Generate QR code'}
          </button>
        </fieldset>
      </div>
    </div>
  );
}
