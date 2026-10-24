import path from 'node:path';
import { Marked } from 'marked';

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function plainText(tokens = []) {
  return tokens.map((token) => token.tokens ? plainText(token.tokens) : (token.text ?? '')).join('');
}

export function documentTitle(markdown) {
  const first = new Marked().lexer(markdown).find((token) => token.type === 'heading' && token.depth === 1);
  if (!first) throw new Error('문서에 첫 번째 제목(#)이 필요합니다.');
  return plainText(first.tokens);
}

export function rewriteLink(href, source, routes, basePath) {
  const value = href.trim();
  if (/[\u0000-\u0020\u007f]/u.test(value)) throw new Error('링크에 허용되지 않는 공백이나 제어문자가 있습니다.');
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.username || url.password) throw new Error('사용자 정보가 포함된 URL은 게시하지 않습니다.');
    return { href: url.href, external: true };
  }
  if (/^mailto:/i.test(value)) return { href: value, external: true };
  if (value.startsWith('#')) return { href: value, external: false };
  if (!value || value.startsWith('/') || value.includes('\\') || /^[a-z][a-z\d+.-]*:/i.test(value)) {
    throw new Error('지원하지 않는 문서 링크: ' + href);
  }
  const match = value.match(/^([^?#]+)(\?[^#]*)?(#.*)?$/);
  if (!match) throw new Error('올바르지 않은 문서 링크: ' + href);
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), decodeURIComponent(match[1])));
  const route = routes.get(target);
  if (route === undefined) throw new Error('게시 대상에 없는 문서 링크: ' + target);
  return { href: basePath + route + (match[2] ?? '') + (match[3] ?? ''), external: false };
}

export function renderMarkdown(markdown, { source, routes, basePath = '' }) {
  const usedIds = new Map();
  const headings = [];
  const parser = new Marked({
    gfm: true,
    renderer: {
      html({ text }) { return escapeHtml(text); },
      link({ href, title, tokens }) {
        const link = rewriteLink(href, source, routes, basePath);
        return '<a href="' + escapeHtml(link.href) + '"' +
          (title ? ' title="' + escapeHtml(title) + '"' : '') +
          (link.external ? ' rel="noreferrer"' : '') + '>' + this.parser.parseInline(tokens) + '</a>';
      },
      image({ href, text }) {
        const link = rewriteLink(href, source, routes, basePath);
        if (!/^https?:\/\//.test(link.href)) throw new Error('이미지는 HTTP(S) 주소만 지원합니다.');
        return '<img src="' + escapeHtml(link.href) + '" alt="' + escapeHtml(text) + '" loading="lazy" referrerpolicy="no-referrer">';
      },
      heading({ tokens, depth }) {
        const text = plainText(tokens);
        const baseId = text.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
        const count = usedIds.get(baseId) ?? 0;
        usedIds.set(baseId, count + 1);
        const id = baseId + (count ? '-' + count : '');
        headings.push({ id, text, depth });
        return '<h' + depth + ' id="' + escapeHtml(id) + '">' + this.parser.parseInline(tokens) + '</h' + depth + '>\n';
      },
    },
  });
  return { html: parser.parse(markdown), headings };
}
