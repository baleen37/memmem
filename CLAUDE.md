# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Baleen Claude Plugins** - Claude Code용 플러그인 모음입니다. AI 보조 개발을 위한 도구들을 제공합니다.

### 주요 플러그인

- **Ralph Loop**: Ralph Wiggum 기법을 구현한 반복적 자기 참조 AI 개발 루프
- **Example Plugin**: 모든 컴포넌트 유형을 보여주는 데모 플러그인
- **Dotfiles Plugin**: 개인용 Claude Code 설정 관리

## Common Commands

### 테스트 실행

```bash
# 모든 테스트 실행
bash tests/run-tests.sh

# 개별 BATS 테스트 실행
bats tests/directory_structure.bats
bats tests/marketplace_json.bats
bats tests/plugin_json.bats
bats tests/command_files.bats
bats tests/skill_files.bats
```

### 검증 (Validation)

```bash
# 전체 검증 실행
bash scripts/validate-plugin.sh

# 개별 검증 실행
bash scripts/validate-structure.sh    # 구조 검증
bash scripts/validate-json.sh         # JSON 유효성
python3 scripts/validate-frontmatter.py  # YAML frontmatter
bash scripts/validate-naming.sh       # 명명 규칙
bash scripts/validate-paths.sh        # 경로 검증
```

### Pre-commit Hooks

```bash
# pre-commit 실행
pre-commit run --all-files
```

pre-commit은 다음을 검증합니다:
- YAML 검증
- JSON 검증
- ShellCheck (쉘 스크립트 린트)
- markdownlint (Markdown 린트)

## Architecture

### 플러그인 컴포넌트 유형

1. **Commands**: Slash commands (`commands/*.md`)
   - 사용자가 `/command-name`으로 실행
   - YAML frontmatter와 지시사항 포함

2. **Agents**: 자율 전문가 에이전트 (`agents/*.md`)
   - 특정 작업을 자율적으로 수행하는 전문가
   - 전용 도구와 모델 설정 가능

3. **Skills**: 컨텍스트 인식 가이드 (`skills/*/SKILL.md`)
   - 특정 상황에서 자동으로 활성화되는 지침
   - 도메인별 모범 사례 제공

4. **Hooks**: 이벤트 기반 자동화 (`hooks/hooks.json` + `hooks/*.sh`)
   - SessionStart, Stop 등의 이벤트에 반응
   - JSON 설정과 쉘 스크립트로 구성

### Ralph Loop 아키텍처

Ralph Loop는 **Stop hook 후킹** 메커니즘을 사용합니다:

1. **setup-ralph-loop.sh**: 상태 파일 생성 (`~/.claude/ralph-loop/ralph-loop-{session_id}.local.md`)
   - 프롬프트, 최대 반복 횟수, 완료 약속을 저장

2. **stop-hook.sh**: Claude 종료를 가로채고 루프 계속
   - 상태 파일에서 현재 반복 횟수 확인
   - 완료 약속(`<promise>TAG</promise>`) 검출
   - 마지막 어시스턴트 출력을 다음 프롬프트로 피드백
   - 최대 반복 횟수 도달 시 종료

3. **상태 저장소**: `~/.claude/ralph-loop/`
   - 세션별 상태 파일
   - `session-env.sh`에 세션 ID 저장

### 명명 규칙

- **플러그인 이름**: `lowercase-with-hyphens` (소문자, 숫자, 하이픈만)
- **경로 포터빌리티**: `${CLAUDE_PLUGIN_ROOT}` 사용 (절대 경로 하드코딩 금지)
- **JSON 스키마**: `schemas/` 디렉토리 참조

### 파일 구조

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json              # Marketplace 설정
├── plugins/
│   ├── ralph-loop/                   # Ralph Wiggum 반복 개발
│   │   ├── commands/                 # Slash commands
│   │   ├── hooks/                    # SessionStart, Stop hooks
│   │   ├── scripts/                  # Setup & cancel scripts
│   │   └── .claude-plugin/plugin.json
│   ├── example-plugin/               # 플러그인 템플릿
│   └── dotfiles-plugin/              # 개인 설정 플러그인
├── .github/workflows/                # CI/CD workflows
├── scripts/                          # 검증 스크립트
├── tests/                            # BATS 테스트
├── schemas/                          # JSON 스키마
└── docs/                             # 개발/테스트 문서
```

## Development Guidelines

### 새 플러그인 추가

1. `example-plugin`을 복사:
   ```bash
   cp -r plugins/example-plugin plugins/my-plugin
   ```

2. `plugins/my-plugin/.claude-plugin/plugin.json` 업데이트

3. commands, agents, skills, hooks 추가

4. `.claude-plugin/marketplace.json`에 플러그인 등록

5. 검증 실행: `bash scripts/validate-plugin.sh`

### 새 컴포넌트 추가

자세한 내용은 `docs/DEVELOPMENT.md` 참조:
- Commands: `commands/my-command.md`
- Agents: `agents/my-agent.md`
- Skills: `skills/my-skill/SKILL.md`
- Hooks: `hooks/hooks.json` 수정

### Hook Script 작성 시 주의사항

- **set -euo pipefail**: 항상 사용하여 에러 감지
- **jq 사용**: JSON 파싱은 항상 jq 사용 (에러 핸들링 포함)
- **PATH 변수**: `${CLAUDE_PLUGIN_ROOT}` 사용하여 포터빌리티 확보
- **에러 메시지**: stderr(`>&2`)로 출력
- **종료 코드**: 성공 시 0, 실패 시 비0 반환

## Ralph Loop 철학

1. **Iteration > Perfection**: 첫 시도에서 완벽을 목표하지 않음
2. **Failures Are Data**: 실패는 예측 가능하고 유익한 데이터
3. **Operator Skill Matters**: 성공은 좋은 모델만이 아니라 좋은 프롬프트 작성에 달림
4. **Persistence Wins**: 성공할 때까지 계속 시도
