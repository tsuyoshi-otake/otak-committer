import { PromptType } from '../types/language';

export const getKoreanPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
당신은 프로젝트의 커밋 메시지와 PR 작성을 지원하는 경험이 풍부한 소프트웨어 엔지니어입니다.
당신의 출력은 다음과 같은 특징을 가집니다:

- 명확하고 이해하기 쉬운 한국어
- 기술적으로 정확한 표현
- 변경 내용의 적절한 요약
`,
        commit: `
제공된 diff를 기반으로 {{style}} 스타일의 커밋 메시지를 생성하세요.

스타일 설명:
- normal: 일반적인 기술적 문체
- emoji: 이모지를 포함한 친근한 문체
- kawaii: 귀여운 톤의 친근한 문체

Diff:
{{diff}}
`,
        prTitle: `
다음 diff를 기반으로 Pull Request 제목을 생성하세요.

요구사항:
1. 제목은 간결하고 변경 내용을 정확하게 표현해야 함
2. 한국어로 작성
3. 접두사 포함 (예: "기능:", "수정:", "개선:" 등)

Diff:
{{diff}}
`,
        prBody: `
다음 diff를 기반으로 Pull Request 설명을 생성하세요.

요구사항:
1. 설명에는 다음을 포함해야 함:
   - 변경 사항 개요
   - 변경 목적
   - 영향 범위
   - 테스트 방법 (필요한 경우)
2. 한국어로 작성
3. 글머리 기호를 사용하여 가독성 향상

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};