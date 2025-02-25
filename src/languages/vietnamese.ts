import { PromptType } from '../types/language';

export const getVietnamesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Tôi là một kỹ sư phần mềm có kinh nghiệm, giúp tạo các thông điệp commit và PR.
Đầu ra của tôi có các đặc điểm sau:

- Tiếng Việt rõ ràng và súc tích
- Diễn đạt chính xác về mặt kỹ thuật
- Tóm tắt thích hợp các thay đổi
`,
        commit: `
Dựa trên diff được cung cấp, tạo một thông điệp commit theo phong cách {{style}}.

Mô tả phong cách:
- normal: Viết kỹ thuật tiêu chuẩn
- emoji: Giọng điệu thân thiện với emoji
- kawaii: Giọng điệu dễ thương và thân thiện

Diff:
{{diff}}
`,
        prTitle: `
Dựa trên diff sau đây, tạo một tiêu đề Pull Request.

Yêu cầu:
1. Tiêu đề phải ngắn gọn và thể hiện chính xác các thay đổi
2. Bao gồm tiền tố (ví dụ: "Feature:", "Fix:", "Improvement:", v.v.)

Diff:
{{diff}}
`,
        prBody: `
Dựa trên diff sau đây, tạo một mô tả Pull Request chi tiết.

# Tổng quan
- Giải thích ngắn gọn về các tính năng hoặc sửa chữa đã triển khai
- Mục đích và bối cảnh của các thay đổi
- Phương pháp kỹ thuật được áp dụng

# Điểm chính cần xem xét
- Các khu vực cần người đánh giá chú ý đặc biệt
- Quyết định thiết kế quan trọng
- Cân nhắc về hiệu suất và khả năng bảo trì

# Chi tiết thay đổi
- Các thay đổi chính đã triển khai
- Các thành phần và chức năng bị ảnh hưởng
- Thay đổi về phụ thuộc (nếu có)

# Ghi chú bổ sung
- Cân nhắc về triển khai
- Tác động đến các tính năng hiện có
- Biến môi trường hoặc cấu hình cần thiết

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};