# 문서 사이트 디자인

이 브랜치에는 `security-support-draft` 문서를 웹페이지로 보여주는 디자인과 빌드 코드를 둡니다.

- `main`: Markdown 원본과 Actions 실행 설정
- `gh-pages`: 디자인, CSS, Markdown 변환 및 로컬 미리보기 코드
- Actions 아티팩트: 생성된 HTML과 CSS. 생성 결과는 브랜치에 커밋하지 않습니다.

문서 본문은 `main`에서만 수정합니다. 이 브랜치로 문서 원본을 복사해 관리하지 않습니다.

## 로컬에서 확인하기

Node.js 22 이상을 사용합니다. 먼저 문서 원본을 별도 작업 폴더에 준비합니다. 이 브랜치의 폴더에서 실행하는 예입니다.

    git worktree add ../security-support-draft-main main
    npm ci --ignore-scripts --no-audit --no-fund
    npm test
    npm run build
    npm run preview

원본 작업 폴더가 이미 있다면 첫 명령은 생략합니다. 다른 위치의 원본을 사용하려면 빌드할 때 지정합니다.

    npm run build -- --content-dir ../content

미리보기 주소는 `http://127.0.0.1:8850/security-support-draft/`입니다. 서버는 이 컴퓨터의 루프백 주소에서만 열립니다. 파일을 수정한 뒤에는 다시 빌드하고 브라우저를 새로고침합니다.

## 게시 대상

`main`의 README를 소개·목차 화면으로, README 목차에 등록한 `proposal/*.md`를 개별 문서로 변환합니다. 기여 안내도 포함합니다. 원문의 제목·문장·순서는 유지하며, 상대 Markdown 링크를 웹페이지 주소로 바꿉니다.

`AGENTS.md`, `CLAUDE.md`, `.git`, 목차에 연결하지 않은 문서와 임시 파일은 배포 결과에 포함하지 않습니다. 수정일은 각 원본 파일의 Git 커밋 날짜를 사용합니다. 로컬의 미커밋 변경은 이 날짜에 반영되지 않습니다.

원문의 HTML은 문자로 표시하고, 실행 가능한 URL이나 게시하지 않는 파일을 가리키는 링크는 빌드를 실패시킵니다. 내부 링크와 문서 내 위치가 실제로 존재하는지도 빌드 중 확인합니다.

출력은 이 작업 폴더 바로 아래 `dist/`에만 만듭니다. 빌드 시 기존 `dist/`를 다시 생성하므로 수동 편집한 파일은 넣지 않습니다. `dist/`와 `node_modules/`는 커밋하지 않습니다.

## 화면 구성

PC에서는 문서 목차와 본문을 나란히 배치하고, 작은 화면에서는 목차를 접어 펼칠 수 있게 합니다. 제목은 24px, 본문은 16px이며 시스템 설정에 따라 밝은·어두운 화면을 적용합니다. 외부 폰트는 사용하지 않습니다.

공통 푸터에는 `https://qlnk.cc/vzl`로 연결되는 99×99px 흑백 SVG QR을 표시합니다. QR을 좌클릭하면 별도 성공 문구 없이 같은 주소를 복사합니다. 이를 위한 JavaScript만 같은 호스트에서 불러옵니다. 우클릭의 링크 주소 복사는 유지하고, 클립보드 사용이 거부되면 수동 복사 방법을 안내합니다.

모든 페이지에 canonical을 두고, 문서에는 수정 날짜를 표시합니다. 별도의 404 문서는 `noindex`를 적용합니다. 보증 부인 본문은 `main`의 README를 따릅니다.

## Actions와 배포

실행 설정은 `main`의 `.github/workflows/pages.yml`에만 둡니다. 문서 변경을 `main`에 푸시하거나 `main`을 선택해 워크플로를 수동 실행하면 다음 순서로 동작합니다.

1. 실행 대상 `main` 커밋을 `content/`에 가져옵니다.
2. `gh-pages`의 디자인 소스를 `site/`에 가져옵니다.
3. `site/`에서 의존성을 설치하고 테스트한 뒤 `content/` 문서를 빌드합니다.
4. `site/dist/`를 아티팩트로 올리고 GitHub Pages에 배포합니다.

디자인만 변경한 경우에는 먼저 `gh-pages`에 반영한 뒤 `main`의 워크플로를 수동 실행합니다. 두 브랜치를 서로 병합하지 않습니다. 각 실행의 체크아웃 로그에서 사용한 두 커밋을 확인할 수 있습니다.

최초 배포 전에는 디자인 브랜치를 먼저 원격에 올리고, 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 합니다. 그다음 `main`의 워크플로를 반영합니다. `github-pages` 배포 환경에서 `main` 실행을 허용합니다.

기본 사이트 주소는 `https://linkymeadow.github.io/security-support-draft/`로 가정합니다. Actions에서는 GitHub Pages 설정에서 읽은 주소를 빌드에 전달하므로, 실제 기본 경로나 사용자 지정 도메인에 맞춰 링크·canonical·사이트맵을 생성합니다.

사용자 지정 도메인 등으로 직접 빌드할 때는 주소와 경로를 함께 지정합니다.

    node scripts/build.mjs --content-dir ../content --site-url https://example.com --base-path "" --out-dir dist

원격 브랜치와 Pages 설정을 준비한 뒤 워크플로를 실행해야 실제 사이트에 배포됩니다.
