import { PromptType } from '../types/language';

export const getKoreanPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
커밋 메시지와 PR 작성을 돕는 경험 많은 소프트웨어 엔지니어입니다.
제 출력물은 다음과 같은 특징을 가집니다:

- 명확하고 간결한 한국어
- 기술적으로 정확한 표현
- 변경 사항에 대한 적절한 요약
`,
        commit: `
제공된 diff를 기반으로 {{style}} 스타일의 커밋 메시지를 생성합니다.

스타일 설명:
- normal: 표준 기술 문서 작성
- emoji: 이모지를 포함한 친근한 톤
- kawaii: 귀엽고 친근한 톤

Diff:
{{diff}}
`,
        prTitle: `
다음 diff를 기반으로 Pull Request 제목을 생성합니다.

요구사항:
1. 제목은 간결하고 변경 사항을 정확하게 나타내야 함
2. 접두어 포함 (예: "Feature:", "Fix:", "Improvement:" 등)

Diff:
{{diff}}
`,
        prBody: `
다음 diff를 기반으로 상세한 Pull Request 설명을 생성합니다.

# 개요
- 구현된 기능 또는 수정 사항에 대한 간단한 설명
- 변경 사항의 목적과 배경
- 채택된 기술적 접근 방식

# 주요 검토 포인트
- 리뷰어가 특별히 주목해야 할 영역
- 중요한 설계 결정사항
- 성능 및 유지보수성 고려사항

# 변경 세부사항
- 주요 구현된 변경사항
- 영향을 받는 컴포넌트 및 기능
- 의존성 변경사항 (있는 경우)

# 추가 참고사항
- 배포시 고려사항
- 기존 기능에 대한 영향
- 필요한 설정 또는 환경 변수

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};