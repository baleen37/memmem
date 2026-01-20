# Jira MCP Plugin

Atlassian Jira를 Claude Code와 통합하는 플러그인입니다. 공식 Atlassian MCP 서버를 통해 Jira 이슈를 조회, 생성, 수정할 수 있습니다.

## 기능

- **이슈 조회**: 특정 이슈의 상세 정보 확인
- **이슈 생성**: 새로운 버그, 작업, 스토리 생성
- **이슈 검색**: JQL을 사용한 이슈 검색
- **이슈 수정**: 상태 변경, 할당자 변경, 코멘트 추가
- **워크플로우 관리**: 이슈 상태 전환 및 워크플로우 따르기

## 설치

### 1. 플러그인 설치

Claude Code에서 플러그인을 설치합니다:

```bash
# Claude Code CLI를 사용하는 경우
claude-code plugin install baleen-plugins/jira

# 또는 marketplace에서 직접 설치
```

### 2. Atlassian 계정 연동

플러그인 설치 후 처음 Jira 관련 명령을 실행하면 OAuth 인증 프로세스가 시작됩니다:

1. 브라우저가 자동으로 열립니다
2. Atlassian 계정으로 로그인합니다
3. Claude Code에 Jira 접근 권한을 부여합니다
4. 인증 완료 후 Claude Code로 돌아옵니다

## 사용 예제

### 이슈 조회

```
"PROJ-123 이슈 정보를 보여줘"
```

### 이슈 생성

```
"새 버그 이슈를 만들어줘: 로그인 버튼이 작동하지 않음"
```

### 이슈 검색

```
"지난주에 생성된 미완료 이슈 목록을 보여줘"
```

### 이슈 수정

```
"PROJ-123 이슈를 In Progress로 변경하고 나한테 할당해줘"
```

### 코멘트 추가

```
"PROJ-123 이슈에 '코드 리뷰 완료했습니다'라고 코멘트 달아줘"
```

## 설정

### 공식 Atlassian MCP 서버 (기본값)

이 플러그인은 기본적으로 Atlassian의 공식 Remote MCP 서버를 `mcp-remote` 프록시를 통해 사용합니다.

**설정:**
```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.atlassian.com/v1/mcp"]
    }
  }
}
```

**장점:**
- 공식 지원 및 안정성
- OAuth 2.1 인증 자동 처리 (브라우저 기반)
- 토큰 자동 캐싱 (재인증 불필요)
- Jira, Confluence, Compass 통합 지원

**요구사항:**
- Node.js v18 이상
- Atlassian Cloud 계정
- 인터넷 연결

**인증 프로세스:**
1. 처음 실행 시 브라우저가 자동으로 열립니다
2. Atlassian 계정으로 로그인
3. Claude Code 접근 권한 승인
4. 토큰이 자동으로 캐시되어 이후 사용 시 재인증 불필요

### 로컬 MCP 서버 (고급 사용자)

온프레미스 Jira를 사용하거나 직접 제어가 필요한 경우 로컬 MCP 서버를 설정할 수 있습니다.

#### 1. 로컬 MCP 서버 설치

```bash
# cosmix/jira-mcp 사용 예시
git clone https://github.com/cosmix/jira-mcp.git
cd jira-mcp
npm install
npm run build
```

#### 2. 환경 변수 설정

```bash
export JIRA_API_TOKEN="your-api-token"
export JIRA_BASE_URL="https://your-domain.atlassian.net"
export JIRA_USER_EMAIL="your-email@example.com"
```

#### 3. `.mcp.json` 수정

플러그인 디렉토리의 `.mcp.json` 파일을 수정하여 로컬 서버를 가리키도록 합니다:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp/build/index.js"],
      "env": {
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "JIRA_BASE_URL": "${JIRA_BASE_URL}",
        "JIRA_USER_EMAIL": "${JIRA_USER_EMAIL}"
      }
    }
  }
}
```

자세한 내용은 [cosmix/jira-mcp](https://github.com/cosmix/jira-mcp) 문서를 참조하세요.

## 지원되는 기능

Atlassian MCP 서버는 다음 기능을 지원합니다:

- ✅ 이슈 조회 (issue details)
- ✅ 이슈 생성 (create issue)
- ✅ 이슈 검색 (JQL search)
- ✅ 이슈 수정 (update issue)
- ✅ 코멘트 추가 (add comment)
- ✅ 상태 전환 (transition issue)
- ✅ 프로젝트 목록 조회 (list projects)

## 문제 해결

### OAuth 인증 실패

인증이 실패하는 경우:

1. Node.js v18 이상이 설치되어 있는지 확인: `node --version`
2. 브라우저에서 Atlassian 계정에 로그인되어 있는지 확인
3. 팝업 차단이 활성화되어 있지 않은지 확인
4. 네트워크 방화벽이 `mcp.atlassian.com` 접근을 차단하지 않는지 확인
5. `mcp-remote` 패키지가 설치되지 않는 경우: `npm install -g mcp-remote`

### 이슈 조회/생성 실패

1. Jira Cloud 계정이 활성화되어 있는지 확인
2. 해당 프로젝트에 대한 권한이 있는지 확인
3. 프로젝트 키(예: `PROJ`)가 올바른지 확인

### 로컬 서버 연결 문제

1. 환경 변수가 올바르게 설정되어 있는지 확인
2. API 토큰이 유효한지 확인
3. Jira 베이스 URL이 올바른지 확인 (슬래시 없이)

## 참고 자료

- [Atlassian Remote MCP Server 공식 발표](https://www.atlassian.com/blog/announcements/remote-mcp-server)
- [Atlassian MCP Server GitHub](https://github.com/atlassian/atlassian-mcp-server)
- [Jira Cloud API 문서](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [JQL 쿼리 가이드](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/)

## 라이선스

이 플러그인은 MIT 라이선스로 제공됩니다. 공식 Atlassian MCP 서버는 Atlassian의 서비스 약관에 따라 제공됩니다.

## 기여

버그 리포트 및 기능 제안은 이슈 트래커를 통해 제출해주세요.
