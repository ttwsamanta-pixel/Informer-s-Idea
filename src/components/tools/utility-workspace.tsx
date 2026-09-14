'use client';
import { useState } from 'react';
import type { ToolDefinition } from '@/types/tools';
import {
  runUtility,
  defaultUtilitySettings,
  unitOptions,
  type UtilitySettings,
} from '@/lib/processing/utility';
import { Field, TextResult, PrivacyNotice, ErrorMessage } from './shared';
export default function UtilityWorkspace({ tool }: { tool: ToolDefinition }) {
  const [settings, setSettings] = useState<UtilitySettings>({
    ...defaultUtilitySettings,
    count: tool.operation === 'uuid' || tool.operation === 'lorem' ? 3 : 16,
  });
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const op = tool.operation;
  const update = <K extends keyof UtilitySettings>(
    k: K,
    v: UtilitySettings[K],
  ) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setOutput('');
  };
  return (
    <div className="workspace">
      <div className="workspace-card">
        <h2>Your input</h2>
        {!['uuid', 'password', 'lorem', 'color'].includes(op) && (
          <Field
            label={
              op === 'unit'
                ? 'Value'
                : op === 'hex'
                  ? 'HEX color'
                  : op === 'rgb'
                    ? 'RGB values (e.g. 73, 54, 255)'
                    : 'Text'
            }
          >
            <textarea
              rows={9}
              value={settings.input}
              placeholder={
                op === 'json' ? 'Paste your JSON here…' : 'Enter your content…'
              }
              onChange={(e) => update('input', e.target.value)}
            />
          </Field>
        )}
        {op === 'color' && (
          <Field label="Choose a color">
            <input
              type="color"
              value={settings.color}
              onChange={(e) => update('color', e.target.value)}
              style={{ height: 150 }}
            />
          </Field>
        )}
        {['uuid', 'password', 'lorem'].includes(op) && (
          <Field
            label={
              op === 'password'
                ? 'Password length (8–128)'
                : op === 'lorem'
                  ? 'Paragraphs (1–20)'
                  : 'UUID count (1–100)'
            }
          >
            <input
              type="number"
              min={op === 'password' ? 8 : 1}
              max={op === 'password' ? 128 : op === 'lorem' ? 20 : 100}
              value={settings.count}
              onChange={(e) => update('count', Number(e.target.value))}
            />
          </Field>
        )}
        {op === 'case' && (
          <Field label="Letter case">
            <select
              value={settings.mode}
              onChange={(e) => update('mode', e.target.value)}
            >
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="title">Title Case</option>
            </select>
          </Field>
        )}
        {op === 'timestamp' && (
          <Field label="Numeric timestamp unit">
            <select
              value={settings.mode}
              onChange={(e) => update('mode', e.target.value)}
            >
              <option value="upper">Seconds</option>
              <option value="milliseconds">Milliseconds</option>
            </select>
          </Field>
        )}
        {op === 'unit' && (
          <div className="field-row">
            {(['unitFrom', 'unitTo'] as const).map((k) => (
              <Field key={k} label={k === 'unitFrom' ? 'From' : 'To'}>
                <select
                  value={settings[k]}
                  onChange={(e) => update(k, e.target.value)}
                >
                  {unitOptions.map((u) => (
                    <option value={u} key={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
        )}
        <div className="result-actions">
          <button
            className="button primary"
            onClick={() => {
              setError('');
              try {
                setOutput(runUtility(op, settings));
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Please check your input.',
                );
              }
            }}
          >
            {['uuid', 'password', 'lorem'].includes(op)
              ? 'Generate'
              : tool.name}
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setSettings({ ...settings, input: '' });
              setOutput('');
              setError('');
            }}
          >
            Clear
          </button>
        </div>
        <ErrorMessage message={error} />
        <PrivacyNotice />
      </div>
      <div className="workspace-card">
        <h2>Your result</h2>
        {output ? (
          <TextResult text={output} name={tool.slug + '.txt'} />
        ) : (
          <div className="empty-state">
            <h3>A little input. An instant answer.</h3>
            <p>Your result will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
