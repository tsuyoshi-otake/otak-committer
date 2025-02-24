export interface CommitPrefix {
    prefix: string;
    description: {
        english: string;
        japanese: string;
        korean: string;
        chinese: string;
        arabic: string;
        hebrew: string;
    };
}

export const COMMIT_PREFIXES: CommitPrefix[] = [
    {
        prefix: 'fix',
        description: {
            english: 'A bug fix',
            japanese: 'バグ修正',
            korean: '버그 수정',
            chinese: '错误修复',
            arabic: 'إصلاح خلل',
            hebrew: 'תיקון באג'
        }
    },
    {
        prefix: 'feat',
        description: {
            english: 'A new feature',
            japanese: '新機能の追加',
            korean: '새로운 기능',
            chinese: '新功能',
            arabic: 'ميزة جديدة',
            hebrew: 'תכונה חדשה'
        }
    },
    {
        prefix: 'docs',
        description: {
            english: 'Documentation only changes',
            japanese: 'ドキュメントの変更のみ',
            korean: '문서 변경',
            chinese: '仅文档更改',
            arabic: 'تغييرات في التوثيق فقط',
            hebrew: 'שינויים בתיעוד בלבד'
        }
    },
    {
        prefix: 'style',
        description: {
            english: 'Changes that do not affect the meaning of the code',
            japanese: 'コードの意味に影響を与えない変更（空白、フォーマット、セミコロンの欠落など）',
            korean: '코드의 의미에 영향을 주지 않는 변경(공백, 서식, 세미콜론 누락 등)',
            chinese: '不影响代码含义的更改（空格、格式、缺少分号等）',
            arabic: 'تغييرات لا تؤثر على معنى الكود (المسافات البيضاء، التنسيق، الفواصل المنقوطة المفقودة، إلخ)',
            hebrew: 'שינויים שאינם משפיעים על משמעות הקוד (רווחים, פורמט, חוסר בנקודה-פסיק וכו׳)'
        }
    },
    {
        prefix: 'refactor',
        description: {
            english: 'A code change that neither fixes a bug nor adds a feature',
            japanese: 'バグ修正や機能追加を含まないコードの変更',
            korean: '버그를 수정하거나 기능을 추가하지 않는 코드 변경',
            chinese: '既不修复错误也不添加功能的代码更改',
            arabic: 'تغيير في الكود لا يصلح خللاً ولا يضيف ميزة',
            hebrew: 'שינוי קוד שאינו מתקן באג ואינו מוסיף תכונה'
        }
    },
    {
        prefix: 'perf',
        description: {
            english: 'A code change that improves performance',
            japanese: 'パフォーマンスを改善するコードの変更',
            korean: '성능을 향상시키는 코드 변경',
            chinese: '提高性能的代码更改',
            arabic: 'تغيير في الكود يحسن الأداء',
            hebrew: 'שינוי קוד שמשפר ביצועים'
        }
    },
    {
        prefix: 'test',
        description: {
            english: 'Adding missing or correcting existing tests',
            japanese: 'テストの追加や既存のテストの修正',
            korean: '누락된 테스트 추가 또는 기존 테스트 수정',
            chinese: '添加缺失的测试或修正现有的测试',
            arabic: 'إضافة اختبارات مفقودة أو تصحيح اختبارات موجودة',
            hebrew: 'הוספת בדיקות חסרות או תיקון בדיקות קיימות'
        }
    },
    {
        prefix: 'chore',
        description: {
            english: 'Changes to the build process or auxiliary tools',
            japanese: 'ビルドプロセスや補助ツールの変更',
            korean: '빌드 프로세스 또는 보조 도구 변경',
            chinese: '构建过程或辅助工具的更改',
            arabic: 'تغييرات في عملية البناء أو الأدوات المساعدة',
            hebrew: 'שינויים בתהליך הבנייה או בכלי עזר'
        }
    }
];