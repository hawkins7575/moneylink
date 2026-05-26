# MoneyLink | 기술 명세 및 개발 문서 (ver-1)

> **상태:** v1.0.0 (2026-04-06) - 한국형 자유 게시판 고도화 완료 버전

## 1. 프로젝트 개요
'MoneyLink'는 주식, 코인, 부동산 등 흩어져 있는 금융 및 경제 핵심 사이트들을 통합하여 제공하는 **프리미엄 금융 큐레이션 포털**입니다. 사용자가 직접 즐겨찾기를 관리하고, 경제 인사이트를 기록하며, 최신 금융 정보를 한눈에 파악할 수 있도록 설계되었습니다.

---

## 2. 기술 스택 (Tech Stack)

### Frontend
- **Language:** HTML5, Vanilla JavaScript (ES6+)
- **Styling:** Vanilla CSS3 (Custom Design System: Modern Glassmorphism & Editorial Style)
- **Editor:** Quill.js (Rich Text Editor for Insights)
- **Icons:** FontAwesome 6.4.0
- **Typography:** Pretendard Variable, Nanum Square Neo

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB Atlas (Cloud NoSQL)
- **ODM:** Mongoose
- **Utility:** Axios (HTTP Client), Cheerio (HTML Parsing for Metadata)

### Deployment & DevOps
- **Hosting:** Vercel (Production ready)
- **Version Control:** Git / GitHub

---

## 3. 프로젝트 구조 (Directory Structure)

```text
/ (Root)
├── server.js               # Express 서버 엔트리 포인트 및 API 라우팅
├── package.json            # 프로젝트 의존성 및 스크립트 설정
├── .env                    # 환경 변수 (MongoDB URI, PORT 등)
├── vercel.json             # Vercel 배포 설정
├── models/                 # Mongoose 데이터 모델 (Schema)
│   ├── User.js             # 사용자 스키마
│   ├── Category.js         # 카테고리 스키마
│   ├── Item.js             # 즐겨찾기 항목 스키마
│   ├── Post.js             # 게시글/인사이트 스키마
│   └── Shortcut.js         # 바로가기 스키마
└── public/                 # 정적 프론트엔드 리소스
    ├── index.html          # 메인 UI 구조
    ├── style.css           # 디자인 시스템 및 스타일링
    ├── data.js             # 초기 데이터 및 설정 (Fallback용)
    └── js/
        └── main.js         # 프론트엔드 비즈니스 로직 및 API 통신
```

---

## 4. 핵심 메뉴 및 기능 (Menu & Features)

### 주요 메뉴 (Navigation)
1.  **대시보드 (Dashboard):** 사용자가 등록한 금융 사이트들을 카테고리별로 열람하고 필터링하는 메인 화면.
2.  **게시판 (Board):** Elfsight 위젯을 활용한 자유 게시판 및 사용자 간 정보 공유 공간.
3.  **익스프레스 (Express):** 주요 금융 기관(은행, 증권사) 바로가기 버튼 모음.
4.  **알파 리포트 (Alpha Report):** 관리자 및 사용자가 직접 작성하는 심층 경제 인사이트 게시판.

### 주요 기능
-   **실시간 동기화:** MongoDB Atlas와 연동하여 모든 기기에서 동일한 데이터 유지.
-   **메타데이터 크롤링:** URL 입력 시 `Cheerio`를 통해 사이트 제목과 설명을 자동으로 가져오기.
-   **동적 카테고리 관리:** 대분류/소분류를 직접 생성하고 관리하는 CMS 기능.
-   **사용자 인증:** 아이디/비밀번호 기반의 회원가입 및 로그인 시스템.
-   **반응형 디자인:** Mobile(Sidebar Overlay)과 Desktop 최적화 UI 제공.

---

## 5. API 명세 (API Endpoints)

-   `GET /api/data`: 전체 데이터(사용자, 카테고리, 항목, 포스트 등) 조회.
-   `POST /api/data`: 전체 데이터 동기화 및 저장.
-   `GET /api/fetch-meta?url=...`: 외부 사이트의 제목 및 설명 크롤링.

---

## 6. 개발 및 실행 방법
1.  **의존성 설치:** `npm install`
2.  **환경 변수 설정:** `.env` 파일에 `MONGODB_URI` 입력
3.  **서버 실행:** `npm start`
4.  **접속:** `http://localhost:8086`

---

## 7. 구글 애드센스 및 SEO 자산 보호 가이드 (AdSense & SEO Asset Protection)

> [!IMPORTANT]
> **본 프로젝트는 구글 애드센스 광고 승인 및 사이트 검색 노출 최적화(SEO)가 활성화되어 있습니다. 향후 사이트 리뉴얼, 업데이트 또는 기능 추가 시 아래 파일들의 코드와 메타 데이터를 절대 임의로 삭제하거나 수정해서는 안 됩니다.**

### 1) index.html 헤더 보호 (`public/index.html`)
- **구글 애드센스 연동 코드**: 헤더 내 `<meta name="google-adsense-account" content="ca-pub-1493954029378412">` 및 애드센스 스크립트(`adsbygoogle.js`)를 반드시 보존해야 합니다.
- **기타 SEO 요소**: Canonical 태그 및 JSON-LD 구조화 데이터 스키마를 항상 유지해야 합니다.

### 2) server.js 동적 SSR 헤더 보호 (`server.js`)
- **동적 게시글 헤더 SSR**: `/insight/:id` 및 `/board/:id` 라우트에서 호출하는 HTML 렌더러(`<head>` 템플릿 부분) 내부에 삽입된 애드센스 메타 태그 및 광고 스크립트가 누락되지 않도록 코드 수정을 방어해야 합니다.

### 3) ads.txt 및 robots.txt 보호
- **public/ads.txt**: 구글 퍼블리셔 인증 코드(`google.com, pub-1493954029378412, DIRECT, f08c47fec0942fa0`)가 훼손되지 않아야 합니다.
- **vercel.json**: `/ads.txt` 및 `/robots.txt`에 대한 Vercel static rewrites 규칙을 삭제하지 마십시오.

