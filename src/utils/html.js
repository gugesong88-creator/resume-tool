function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function looksLikeRichHtml(value) {
  if (!value) return false;
  return /<\/?(span|font|b|strong|i|em|u|br)\b/i.test(String(value));
}

function normalizeColorValue(value) {
  if (!value) return '';

  const v = String(value).trim();

  // 允许基础 hex 色值
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;

  // 允许 rgb / rgba
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(v)) return v;

  // 允许基础英文颜色名
  const allowedNames = {
    black: '#111827',
    white: '#FFFFFF',
    gray: '#6B7280',
    grey: '#6B7280',
    red: '#DC2626',
    blue: '#1E3A8A',
    yellow: '#D97706',
    green: '#059669'
  };

  return allowedNames[v.toLowerCase()] || '';
}

function sanitizeRichHtml(input) {
  if (input == null) return '';

  const raw = String(input);

  // 没有富文本标签时，保持原文本
  if (!looksLikeRichHtml(raw)) {
    return raw;
  }

  const template = document.createElement('template');
  template.innerHTML = raw;

  const allowedTags = new Set([
    'SPAN',
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'BR',
    'FONT'
  ]);

  function unwrapNode(node) {
    const parent = node.parentNode;
    if (!parent) return;

    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }

    parent.removeChild(node);
  }

  function walk(node) {
    const children = Array.from(node.childNodes);

    children.forEach(child => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const tag = child.tagName;

      if (!allowedTags.has(tag)) {
        unwrapNode(child);
        return;
      }

      if (tag === 'FONT') {
        const color = normalizeColorValue(child.getAttribute('color'));
        const span = document.createElement('span');

        if (color) {
          span.setAttribute('style', `color: ${color};`);
        }

        while (child.firstChild) {
          span.appendChild(child.firstChild);
        }

        child.parentNode.replaceChild(span, child);
        walk(span);
        return;
      }

      // 清除所有属性，只保留 span 上安全的 color 样式
      const oldStyle = child.getAttribute('style') || '';
      Array.from(child.attributes).forEach(attr => {
        child.removeAttribute(attr.name);
      });

      if (tag === 'SPAN') {
        const colorMatch = oldStyle.match(/color\s*:\s*([^;]+)/i);

        if (colorMatch) {
          const color = normalizeColorValue(colorMatch[1]);

          if (color) {
            child.setAttribute('style', `color: ${color};`);
          }
        }
      }

      walk(child);
    });
  }

  walk(template.content);

  return template.innerHTML;
}

function richTextToPlain(value) {
  if (value == null) return '';

  const s = String(value);

  if (!looksLikeRichHtml(s)) {
    return s.replace(/<[^>]*>/g, '');
  }

  const div = document.createElement('div');
  div.innerHTML = sanitizeRichHtml(s);

  return div.textContent || '';
}

function replaceTextNodeWithRichHtml(textNode) {
  if (!textNode || !textNode.nodeValue) return;

  const text = textNode.nodeValue;

  if (!looksLikeRichHtml(text)) return;

  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(text);

  textNode.parentNode.replaceChild(template.content.cloneNode(true), textNode);
}

function decodeEscapedRichTextInPreview(root) {
  if (!root) return;

  const editables = root.querySelectorAll('[data-editable]');

  editables.forEach(el => {
    if (el.getAttribute('contenteditable') === 'false') return;

    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !looksLikeRichHtml(node.nodeValue)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(replaceTextNodeWithRichHtml);
  });
}


window.escHtml = escHtml;
window.looksLikeRichHtml = looksLikeRichHtml;
window.normalizeColorValue = normalizeColorValue;
window.sanitizeRichHtml = sanitizeRichHtml;
window.richTextToPlain = richTextToPlain;
window.replaceTextNodeWithRichHtml = replaceTextNodeWithRichHtml;
window.decodeEscapedRichTextInPreview = decodeEscapedRichTextInPreview;
