import { useState, type CSSProperties, type ReactNode } from 'react';
import { contrastRatio } from '../tokens/contrast';
import { contrastPairs } from '../tokens/pairs';
import {
  palette,
  resolveColor,
  scales,
  themes,
  TOKEN_PREFIX,
  type ColorRole,
  type ColorValue,
  type ThemeName,
} from '../tokens/tokens';
import styles from './TokenDocs.module.css';

const themeNames = Object.keys(themes) as ThemeName[];

function describeValue(value: ColorValue): string {
  return typeof value === 'string' ? value : value.raw;
}

function Code({ children }: { children: ReactNode }) {
  return <code className={styles.code}>{children}</code>;
}

const roleGroups: { title: string; match: (role: string) => boolean }[] = [
  { title: 'Surfaces', match: (r) => r.startsWith('bg-') || r === 'overlay' },
  { title: 'Text', match: (r) => r.startsWith('fg-') },
  { title: 'Borders', match: (r) => r.startsWith('border-') },
  { title: 'Accent', match: (r) => r.startsWith('accent-') },
  {
    title: 'Status tones',
    match: (r) => /^(success|warning|danger|info)-/.test(r),
  },
];

/** Semantic color roles, rendered live in both themes. */
export function ColorRoles() {
  const roles = Object.keys(themes.light.color) as ColorRole[];
  return (
    <div className={styles.stack}>
      {roleGroups.map((group) => (
        <section key={group.title}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Token</th>
                {themeNames.map((name) => (
                  <th scope="col" key={name}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.filter(group.match).map((role) => (
                <tr key={role}>
                  <th scope="row">
                    <Code>{`${TOKEN_PREFIX}-color-${role}`}</Code>
                  </th>
                  {themeNames.map((name) => (
                    <td key={name}>
                      <span className={styles.swatchWithLabel}>
                        <span data-theme={name} className={styles.swatchCell}>
                          <span
                            className={styles.swatch}
                            style={{ background: `var(${TOKEN_PREFIX}-color-${role})` }}
                            aria-hidden="true"
                          />
                        </span>
                        <span className={styles.muted}>
                          {describeValue(themes[name].color[role])}
                        </span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

/** Every foreground/background pairing with its computed WCAG contrast ratio. */
export function ContrastTable() {
  return (
    <table className={styles.table}>
      <caption className={styles.caption}>
        Contrast ratios are computed from the token values. The same check runs in CI, so a failing
        pair fails the build.
      </caption>
      <thead>
        <tr>
          <th scope="col">Usage</th>
          <th scope="col">Pair</th>
          <th scope="col">Min</th>
          {themeNames.map((name) => (
            <th scope="col" key={name}>
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {contrastPairs.map((pair) => (
          <tr key={`${pair.fg}/${pair.bg}`}>
            <td>{pair.usage}</td>
            <td>
              <Code>{pair.fg}</Code> on <Code>{pair.bg}</Code>
            </td>
            <td>{pair.min}:1</td>
            {themeNames.map((name) => {
              const fg = resolveColor(themes[name].color[pair.fg]);
              const bg = resolveColor(themes[name].color[pair.bg]);
              const ratio = contrastRatio(fg, bg);
              const pass = ratio >= pair.min;
              return (
                <td key={name}>
                  <span className={styles.contrastSample} style={{ color: fg, background: bg }}>
                    Aa
                  </span>{' '}
                  {ratio.toFixed(2)}:1{' '}
                  <span className={pass ? styles.pass : styles.fail}>{pass ? 'Pass' : 'Fail'}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Raw palette primitives. */
export function PaletteGrid() {
  return (
    <div className={styles.stack}>
      {Object.entries(palette).map(([name, steps]) => (
        <div key={name}>
          <h3 className={styles.groupTitle}>{name}</h3>
          <ul className={styles.paletteRow}>
            {Object.entries(steps).map(([step, hex]) => (
              <li key={step} className={styles.paletteChip}>
                <span
                  className={styles.paletteSwatch}
                  style={{ background: hex }}
                  aria-hidden="true"
                />
                <span className={styles.paletteLabel}>
                  {step}
                  <br />
                  <span className={styles.muted}>{hex}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function entries(group: Record<string, string>, prefix: string) {
  return Object.entries(group).filter(([name]) => name.startsWith(prefix));
}

export function TypeScale() {
  return (
    <div className={styles.stack}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            <th scope="col">Sample</th>
          </tr>
        </thead>
        <tbody>
          {entries(scales.font, 'size-').map(([name, value]) => (
            <tr key={name}>
              <th scope="row">
                <Code>{`${TOKEN_PREFIX}-font-${name}`}</Code>
              </th>
              <td>{value}</td>
              <td style={{ fontSize: `var(${TOKEN_PREFIX}-font-${name})` }}>
                Accessible by default
              </td>
            </tr>
          ))}
          {entries(scales.font, 'weight-').map(([name, value]) => (
            <tr key={name}>
              <th scope="row">
                <Code>{`${TOKEN_PREFIX}-font-${name}`}</Code>
              </th>
              <td>{value}</td>
              <td style={{ fontWeight: `var(${TOKEN_PREFIX}-font-${name})` }}>
                Accessible by default
              </td>
            </tr>
          ))}
          {[...entries(scales.font, 'line-height-'), ...entries(scales.font, 'family-')].map(
            ([name, value]) => (
              <tr key={name}>
                <th scope="row">
                  <Code>{`${TOKEN_PREFIX}-font-${name}`}</Code>
                </th>
                <td colSpan={2} className={styles.muted}>
                  {value}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SpaceScale() {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Value</th>
          <th scope="col">
            <span className={styles.visuallyHidden}>Preview</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(scales.space).map(([name, value]) => (
          <tr key={name}>
            <th scope="row">
              <Code>{`${TOKEN_PREFIX}-space-${name}`}</Code>
            </th>
            <td>{value}</td>
            <td>
              <span
                className={styles.spaceBar}
                style={{ width: `var(${TOKEN_PREFIX}-space-${name})` }}
                aria-hidden="true"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RadiusScale() {
  return (
    <ul className={styles.tileRow}>
      {Object.entries(scales.radius).map(([name, value]) => (
        <li key={name} className={styles.tileItem}>
          <span
            className={styles.radiusTile}
            style={{ borderRadius: `var(${TOKEN_PREFIX}-radius-${name})` }}
            aria-hidden="true"
          />
          <Code>{`${TOKEN_PREFIX}-radius-${name}`}</Code>
          <span className={styles.muted}>{value}</span>
        </li>
      ))}
    </ul>
  );
}

export function ShadowScale() {
  return (
    <div className={styles.split}>
      {themeNames.map((theme) => (
        <div key={theme} data-theme={theme} className={styles.themePanel}>
          <p className={styles.panelLabel}>{theme}</p>
          <ul className={styles.tileRow}>
            {Object.keys(themes[theme].shadow).map((name) => (
              <li key={name} className={styles.tileItem}>
                <span
                  className={styles.shadowTile}
                  style={{ boxShadow: `var(${TOKEN_PREFIX}-shadow-${name})` }}
                  aria-hidden="true"
                />
                <Code>{`${TOKEN_PREFIX}-shadow-${name}`}</Code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function MotionScale() {
  const [moved, setMoved] = useState(false);
  return (
    <div className={styles.stack}>
      <button
        type="button"
        className={styles.demoButton}
        onClick={() => {
          setMoved((m) => !m);
        }}
      >
        Play motion demo
      </button>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            <th scope="col">
              <span className={styles.visuallyHidden}>Preview</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(scales.motion).map(([name, value]) => {
            const isDuration = name.startsWith('duration-');
            const track: CSSProperties = isDuration
              ? { transitionDuration: `var(${TOKEN_PREFIX}-motion-${name})` }
              : {
                  transitionDuration: `var(${TOKEN_PREFIX}-motion-duration-slow)`,
                  transitionTimingFunction: `var(${TOKEN_PREFIX}-motion-${name})`,
                };
            return (
              <tr key={name}>
                <th scope="row">
                  <Code>{`${TOKEN_PREFIX}-motion-${name}`}</Code>
                </th>
                <td className={styles.muted}>{value}</td>
                <td className={styles.motionTrack}>
                  <span
                    className={styles.motionDot}
                    data-moved={moved || undefined}
                    style={track}
                    aria-hidden="true"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SimpleTokenTable({ group }: { group: 'z' | 'size' }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(scales[group]).map(([name, value]) => (
          <tr key={name}>
            <th scope="row">
              <Code>{`${TOKEN_PREFIX}-${group}-${name}`}</Code>
            </th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
