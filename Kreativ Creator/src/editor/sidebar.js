import { getAll, getById, getCategories } from '../templates/registry.js';
import { backgrounds } from '../brand/tokens.js';
import { checkAllFields } from '../brand/taenk-rules.js';

let currentData = {};
let onChange = () => {};

export function initSidebar(container, onChangeCallback) {
  onChange = onChangeCallback;
  renderTemplatePicker(container);
}

export function getCurrentData() {
  return { ...currentData };
}

function renderTemplatePicker(container) {
  const categories = getCategories();
  const allTemplates = getAll();

  container.innerHTML = `
    <div class="sidebar-section">
      <h3 class="sidebar-title">Templates</h3>
      ${categories.map(cat => `
        <div class="sidebar-category">
          <div class="sidebar-category-label">${cat}</div>
          <div class="template-grid">
            ${allTemplates.filter(t => t.category === cat).map(t => `
              <button class="template-thumb" data-id="${t.id}" title="${t.name}">
                <span class="template-thumb-label">${t.thumbnail}</span>
                <span class="template-thumb-name">${t.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div id="field-editor"></div>
    <div id="validation-panel"></div>
  `;

  container.querySelectorAll('.template-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.template-thumb').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectTemplate(btn.dataset.id);
    });
  });

  // Select first template by default
  const firstBtn = container.querySelector('.template-thumb');
  if (firstBtn) {
    firstBtn.classList.add('active');
    selectTemplate(firstBtn.dataset.id);
  }
}

function selectTemplate(id) {
  const tpl = getById(id);
  if (!tpl) return;

  currentData = { _templateId: id };
  for (const field of tpl.meta.fields) {
    currentData[field.key] = field.default;
  }

  renderFieldEditor(tpl.meta);
  onChange(currentData);
}

function renderFieldEditor(meta) {
  const editor = document.getElementById('field-editor');
  if (!editor) return;

  editor.innerHTML = `
    <div class="sidebar-section">
      <h3 class="sidebar-title">Indhold</h3>
      ${meta.fields.map(field => renderField(field)).join('')}
    </div>
  `;

  // Bind events
  editor.querySelectorAll('[data-field]').forEach(el => {
    const key = el.dataset.field;
    const field = meta.fields.find(f => f.key === key);

    if (field.type === 'color') {
      el.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          el.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          currentData[key] = swatch.dataset.value;
          onChange(currentData);
        });
      });
    } else if (field.type === 'image') {
      const input = el.querySelector('input[type="file"]');
      const dropZone = el.querySelector('.drop-zone');

      if (input) {
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            currentData[key] = URL.createObjectURL(file);
            onChange(currentData);
            dropZone.textContent = file.name;
            dropZone.classList.add('has-file');
          }
        });
      }

      if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
          e.preventDefault();
          dropZone.classList.remove('drag-over');
          const file = e.dataTransfer.files[0];
          if (file) {
            currentData[key] = URL.createObjectURL(file);
            onChange(currentData);
            dropZone.textContent = file.name;
            dropZone.classList.add('has-file');
          }
        });
        dropZone.addEventListener('click', () => input?.click());
      }
    } else if (field.type === 'items') {
      // Items are pre-populated, bind change events
      bindItemEvents(el, key, field);
    } else {
      const input = el.querySelector('input, textarea');
      if (input) {
        input.addEventListener('input', () => {
          currentData[key] = input.value;
          onChange(currentData);
          runTaenkCheck();
        });
      }
    }
  });
}

function renderField(field) {
  switch (field.type) {
    case 'text':
      return `
        <div class="field-group" data-field="${field.key}">
          <label class="field-label">${field.label}</label>
          <input type="text" class="field-input" value="${escapeHtml(String(field.default))}" />
        </div>`;

    case 'textarea':
      return `
        <div class="field-group" data-field="${field.key}">
          <label class="field-label">${field.label}</label>
          <textarea class="field-textarea" rows="3">${escapeHtml(String(field.default).replace(/<br>/g, '\n'))}</textarea>
        </div>`;

    case 'color':
      return `
        <div class="field-group" data-field="${field.key}">
          <label class="field-label">${field.label}</label>
          <div class="color-swatches">
            ${backgrounds.map(bg => `
              <button class="color-swatch ${bg.id === field.default ? 'active' : ''}"
                      data-value="${bg.id}"
                      style="background:${bg.hex};"
                      title="${bg.label}"></button>
            `).join('')}
          </div>
        </div>`;

    case 'image':
      return `
        <div class="field-group" data-field="${field.key}">
          <label class="field-label">${field.label}</label>
          <div class="drop-zone">Klik eller tr\u00e6k billede hertil</div>
          <input type="file" accept="image/*" style="display:none;" />
        </div>`;

    case 'items':
      const items = field.default;
      return `
        <div class="field-group" data-field="${field.key}">
          <label class="field-label">${field.label}</label>
          <div class="items-list">
            ${items.map((item, i) => `
              <div class="item-row" data-index="${i}">
                <input type="text" class="field-input item-input" value="${escapeHtml(item.text || item.category || '')}" data-prop="${item.text !== undefined ? 'text' : 'category'}" />
                ${item.result !== undefined ? `<input type="text" class="field-input item-result" value="${escapeHtml(item.result)}" data-prop="result" style="width:80px;" />` : ''}
                <button class="item-remove" title="Fjern">&times;</button>
              </div>
            `).join('')}
            <button class="item-add">+ Tilf\u00f8j</button>
          </div>
        </div>`;

    default:
      return '';
  }
}

function bindItemEvents(container, key, field) {
  const items = [...(currentData[key] || field.default)];

  container.querySelectorAll('.item-input, .item-result').forEach(input => {
    input.addEventListener('input', () => {
      const row = input.closest('.item-row');
      const index = parseInt(row.dataset.index);
      const prop = input.dataset.prop;
      if (items[index]) {
        items[index] = { ...items[index], [prop]: input.value };
        currentData[key] = [...items];
        onChange(currentData);
      }
    });
  });

  container.querySelectorAll('.item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.closest('.item-row').dataset.index);
      items.splice(index, 1);
      currentData[key] = [...items];
      onChange(currentData);
      // Re-render to update indices
      const meta = getById(currentData._templateId)?.meta;
      if (meta) renderFieldEditor(meta);
    });
  });

  const addBtn = container.querySelector('.item-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const sample = items[0] || {};
      const newItem = {};
      for (const k of Object.keys(sample)) {
        newItem[k] = k === 'rank' ? 'top3' : '';
      }
      items.push(newItem);
      currentData[key] = [...items];
      onChange(currentData);
      const meta = getById(currentData._templateId)?.meta;
      if (meta) renderFieldEditor(meta);
    });
  }
}

function runTaenkCheck() {
  const panel = document.getElementById('validation-panel');
  if (!panel) return;

  const issues = checkAllFields(currentData);
  if (issues.length === 0) {
    panel.innerHTML = '';
    return;
  }

  panel.innerHTML = `
    <div class="sidebar-section validation-section">
      ${issues.map(issue => `
        <div class="validation-item validation-${issue.level}">
          <span class="validation-icon">${issue.level === 'error' ? '!' : 'i'}</span>
          <div>
            <div>${issue.message}</div>
            ${issue.suggestions ? `<div class="validation-suggestions">${issue.suggestions.map(s => `<div class="suggestion">"${s}"</div>`).join('')}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
