import { describe, expect, it } from 'vitest';
import { getTabbables } from './focusable';

function fixture(html: string) {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

describe('getTabbables', () => {
  it('returns tabbable elements in DOM order', () => {
    const root = fixture(`
      <a href="#x" id="link">Link</a>
      <a id="no-href">No href</a>
      <button id="button">Button</button>
      <input id="input" />
      <select id="select"><option>a</option></select>
      <textarea id="textarea"></textarea>
      <div tabindex="0" id="div"></div>
      <div contenteditable="true" id="editable"></div>
    `);
    expect(getTabbables(root).map((element) => element.id)).toEqual([
      'link',
      'button',
      'input',
      'select',
      'textarea',
      'div',
      'editable',
    ]);
    root.remove();
  });

  it('excludes disabled, hidden, inert, negative tabindex and hidden inputs', () => {
    const root = fixture(`
      <button disabled>Disabled</button>
      <fieldset disabled><input id="in-fieldset" /></fieldset>
      <div hidden><button>In hidden</button></div>
      <div inert><button>In inert</button></div>
      <button hidden>Hidden itself</button>
      <button tabindex="-1">Negative</button>
      <input type="hidden" />
      <button id="ok">OK</button>
    `);
    expect(getTabbables(root).map((element) => element.id)).toEqual(['ok']);
    root.remove();
  });

  it('returns an empty list when there is nothing tabbable', () => {
    const root = fixture('<p>Text</p>');
    expect(getTabbables(root)).toEqual([]);
    root.remove();
  });
});
