import test from 'node:test';
import assert from 'node:assert/strict';
import { documentTitle, renderMarkdown, rewriteLink } from '../scripts/markdown.mjs';

const routes = new Map([['README.md', '/'], ['proposal/example.md', '/proposal/example/'], ['CONTRIBUTING.md', '/contributing/']]);
const options = { source: 'README.md', routes, basePath: '/security-support-draft' };

test('Markdown 링크는 프로젝트 하위 경로에서도 웹 문서로 연결된다', () => {
  assert.deepEqual(rewriteLink('proposal/example.md#확인', 'README.md', routes, options.basePath), { href: '/security-support-draft/proposal/example/#확인', external: false });
  assert.equal(rewriteLink('../README.md', 'proposal/example.md', routes, '').href, '/');
});

test('미게시 파일·경로 탈출·실행 가능한 URL을 허용하지 않는다', () => {
  for (const href of ['AGENTS.md', '../private.md', 'javascript:alert(1)', 'data:text/html,test', '//evil.invalid', 'java\nscript:alert(1)', 'javascript&#58;alert(1)']) {
    assert.throws(() => rewriteLink(href, 'README.md', routes, ''));
  }
});

test('원문의 HTML은 실행 가능한 요소가 되지 않는다', () => {
  const { html } = renderMarkdown('# 제목\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', options);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('한글 제목과 중복된 절 제목에 안정적인 위치가 생긴다', () => {
  const { headings } = renderMarkdown('# 제목\n\n## 확인할 일\n\n## 확인할 일', options);
  assert.deepEqual(headings.map(({ id }) => id), ['제목', '확인할-일', '확인할-일-1']);
  assert.equal(documentTitle('# **문서** 제목'), '문서 제목');
});

test('목록·인용·줄바꿈·표를 보존하고 속성 안의 따옴표를 이스케이프한다', () => {
  const { html } = renderMarkdown('# 제목\n\n- 첫 번째\n- 두 번째\n\n> 예시\n\n첫 줄\\\n둘째 줄\n\n| 항목 | 값 |\n| --- | --- |\n| 이름 | 예시 |\n\n[링크](https://example.com/ "제목 & 설명")', options);
  for (const tag of ['<ul>', '<blockquote>', '<br>', '<table>']) assert.ok(html.includes(tag));
  assert.ok(html.includes('title="제목 &amp; 설명"'));
});
