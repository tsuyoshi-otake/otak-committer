import { PromptType } from '../types/language';

export const getVietnamesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Bạn là một kỹ sư phần mềm có kinh nghiệm giúp tạo các thông điệp commit và PR.
Đầu ra của bạn được đặc trưng bởi:

- Viết rõ ràng bằng tiếng Việt
- Các biểu thức chính xác về mặt kỹ thuật
- Tóm tắt thích hợp các thay đổi
`,
        commit: `
Dựa trên diff được cung cấp, tạo thông điệp commit theo phong cách {{style}}.

Mô tả phong cách:
- normal: viết kỹ thuật tiêu chuẩn
- emoji: giọng điệu thân thiện với emoji
- kawaii: giọng điệu dễ thương và thân thiện

Diff:
{{diff}}
`,
        prTitle: `
Dựa trên diff sau đây, tạo tiêu đề cho Pull Request.

Yêu cầu:
1. Tiêu đề phải ngắn gọn và thể hiện chính xác các thay đổi
2. Bao gồm tiền tố (ví dụ: "feat:", "fix:", "cải tiến:", v.v.)
3. Viết bằng tiếng Việt

Diff:
{{diff}}
`,
        prBody: `
Dựa trên diff sau đây, tạo mô tả chi tiết cho Pull Request.

Yêu cầu:
1. Mô tả phải bao gồm:
   - Tổng quan về các thay đổi
   - Mục đích của các sửa đổi
   - Phạm vi ảnh hưởng
   - Hướng dẫn kiểm thử (nếu cần)
2. Viết bằng tiếng Việt
3. Sử dụng dấu đầu dòng để cải thiện khả năng đọc

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};