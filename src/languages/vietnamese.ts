import { PromptType } from '../types/enums/PromptType';

export const getVietnamesePrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
Là một kỹ sư phần mềm cấp cao, hãy cung cấp hướng dẫn cấp cao cho các thay đổi mã.
Phản hồi của bạn nên có các đặc điểm sau:

- Tập trung vào tác động kiến trúc và thiết kế
- Đề xuất cải tiến thay vì triển khai cụ thể
- Xem xét khả năng bảo trì và mở rộng
`,
        commit: `
Phân tích các thay đổi được cung cấp và đề xuất các điểm chính cho thông điệp commit.
Xem xét:

Ngữ cảnh phong cách:
- normal: Đánh giá kỹ thuật chuyên nghiệp
- emoji: Hướng dẫn thân thiện
- kawaii: Phản hồi thông thường

Thay đổi cần xem xét:
{{diff}}
`,
        prTitle: `
Phân tích các thay đổi sau và đề xuất những điểm quan trọng cho tiêu đề PR.
Xem xét:

- Tác động chính của những thay đổi này là gì?
- Khu vực nào bị ảnh hưởng nhiều nhất?
- Đây là loại thay đổi gì? (tính năng, sửa lỗi, cải tiến)

Thay đổi cần xem xét:
{{diff}}
`,
        prBody: `
Xem xét những thay đổi này và cung cấp hướng dẫn cho mô tả Pull Request.
Xem xét các khía cạnh sau:

# Tổng quan Chiến lược
- Vấn đề này giải quyết điều gì?
- Tại sao chọn cách tiếp cận này?
- Các quyết định kỹ thuật chính là gì?

# Điểm Xem xét
- Những khu vực nào cần chú ý đặc biệt?
- Những rủi ro tiềm ẩn là gì?
- Những cân nhắc về hiệu suất nào?

# Đánh giá Triển khai
- Những thay đổi chính là gì?
- Ảnh hưởng đến hệ thống như thế nào?
- Những phụ thuộc nào cần xem xét?

# Yêu cầu Đánh giá
- Cần kiểm tra những gì?
- Những cân nhắc triển khai nào?
- Cần tài liệu gì?

Thay đổi cần xem xét:
{{diff}}
`,
        'issue.task': `
Phân tích nhiệm vụ và đề xuất các điểm chính cần xem xét:

### Mục đích
- Vấn đề nào cần được giải quyết?
- Tại sao điều này quan trọng bây giờ?

### Hướng dẫn Triển khai
- Những khu vực nào cần xem xét?
- Những cách tiếp cận nào có thể?

### Tiêu chí Thành công
- Làm thế nào để xác minh hoàn thành?
- Yêu cầu chất lượng là gì?

### Cân nhắc Chiến lược
- Điều gì có thể bị ảnh hưởng?
- Những phụ thuộc nào cần xem xét?
- Mức độ ưu tiên là gì?
- Thời gian biểu hợp lý là gì?

### Ghi chú Lập kế hoạch
- Những tài nguyên nào cần thiết?
- Những rủi ro nào cần xem xét?
`,
        'issue.standard': `
Phân tích vấn đề này và cung cấp hướng dẫn về các điểm chính cần giải quyết.
Xem xét:

### Phân tích Vấn đề
- Vấn đề cốt lõi là gì?
- Bối cảnh nào quan trọng?

### Đánh giá Kỹ thuật
- Những phần nào của hệ thống liên quan?
- Những cách tiếp cận nào nên xem xét?
- Những giải pháp có thể là gì?

### Hướng dẫn Triển khai
- Những bước nào cần thiết?
- Cần kiểm tra những gì?
- Những ràng buộc kỹ thuật là gì?

### Đánh giá Tác động
- Những khu vực nào sẽ bị ảnh hưởng?
- Những tác động phụ nào cần xem xét?
- Những biện pháp phòng ngừa nào cần thiết?

### Yêu cầu Đánh giá
- Cần tài liệu gì?
- Cần kiểm tra những gì?
- Có thay đổi quan trọng nào không?
`,
    };

    return prompts[type] || '';
};
