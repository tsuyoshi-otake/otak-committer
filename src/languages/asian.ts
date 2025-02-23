import { LanguageConfig } from '../types/language';
import { MessageStyle } from '../types/messageStyle';

export const asianLanguages: { [key: string]: LanguageConfig } = {
    japanese: {
        name: '日本語',
        description: 'コミットメッセージを日本語で生成します',
        systemPrompt: (style: MessageStyle) => `
コミットメッセージを日本語で生成してください。
以下のルールに従ってください：
1. 簡潔で分かりやすい日本語を使用
2. 技術的な用語は必要に応じて英語を使用
3. 敬体（です・ます調）は使用しない
4. ${style === 'simple' ? '核となる変更のみを記述' : 
    style === 'normal' ? '変更の概要と主要な影響を記述' : 
    '変更の詳細な説明と影響範囲を記述'}`,
        diffMessage: 'この変更の内容は以下の通りです：'
    },
    chinese: {
        name: '中文',
        description: '用中文生成提交消息',
        systemPrompt: (style: MessageStyle) => `
请用中文生成提交消息。
请遵循以下规则：
1. 使用简洁明了的中文
2. 技术术语可以使用英文
3. 保持专业性
4. ${style === 'simple' ? '仅描述核心更改' : 
    style === 'normal' ? '描述更改概要和主要影响' : 
    '详细说明更改内容和影响范围'}`,
        diffMessage: '变更内容如下：'
    },
    traditionalChinese: {
        name: '繁體中文',
        description: '用繁體中文生成提交消息',
        systemPrompt: (style: MessageStyle) => `
請用繁體中文生成提交消息。
請遵循以下規則：
1. 使用簡潔明瞭的繁體中文
2. 技術術語可以使用英文
3. 保持專業性
4. ${style === 'simple' ? '僅描述核心更改' : 
    style === 'normal' ? '描述更改概要和主要影響' : 
    '詳細說明更改內容和影響範圍'}`,
        diffMessage: '變更內容如下：'
    },
    korean: {
        name: '한국어',
        description: '커밋 메시지를 한국어로 생성',
        systemPrompt: (style: MessageStyle) => `
커밋 메시지를 한국어로 생성해 주세요.
다음 규칙을 따라 주세요:
1. 간결하고 명확한 한국어 사용
2. 기술 용어는 필요한 경우 영어 사용
3. 전문성 유지
4. ${style === 'simple' ? '핵심 변경사항만 기술' : 
    style === 'normal' ? '변경사항 개요와 주요 영향 기술' : 
    '변경사항과 영향 범위 상세 기술'}`,
        diffMessage: '변경 내용은 다음과 같습니다:'
    },
    vietnamese: {
        name: 'Tiếng Việt',
        description: 'Tạo thông điệp commit bằng tiếng Việt',
        systemPrompt: (style: MessageStyle) => `
Vui lòng tạo thông điệp commit bằng tiếng Việt.
Tuân thủ các quy tắc sau:
1. Sử dụng tiếng Việt rõ ràng và súc tích
2. Sử dụng thuật ngữ kỹ thuật bằng tiếng Anh khi cần
3. Duy trì tính chuyên nghiệp
4. ${style === 'simple' ? 'Chỉ mô tả thay đổi cốt lõi' : 
    style === 'normal' ? 'Mô tả tổng quan và tác động chính' : 
    'Mô tả chi tiết thay đổi và phạm vi ảnh hưởng'}`,
        diffMessage: 'Nội dung thay đổi như sau:'
    },
    thai: {
        name: 'ไทย',
        description: 'สร้างข้อความ commit ในภาษาไทย',
        systemPrompt: (style: MessageStyle) => `
กรุณาสร้างข้อความ commit เป็นภาษาไทย
กรุณาปฏิบัติตามกฎต่อไปนี้:
1. ใช้ภาษาไทยที่กระชับและชัดเจน
2. ใช้คำศัพท์ทางเทคนิคเป็นภาษาอังกฤษเมื่อจำเป็น
3. รักษาความเป็นมืออาชีพ
4. ${style === 'simple' ? 'อธิบายเฉพาะการเปลี่ยนแปลงหลัก' : 
    style === 'normal' ? 'อธิบายภาพรวมและผลกระทบหลัก' : 
    'อธิบายรายละเอียดการเปลี่ยนแปลงและขอบเขตผลกระทบ'}`,
        diffMessage: 'การเปลี่ยนแปลงมีดังนี้:'
    },
    hindi: {
        name: 'हिन्दी',
        description: 'कमिट संदेश हिंदी में तैयार करें',
        systemPrompt: (style: MessageStyle) => `
कृपया कमिट संदेश हिंदी में तैयार करें।
कृपया निम्नलिखित नियमों का पालन करें:
1. स्पष्ट और संक्षिप्त हिंदी का प्रयोग करें
2. आवश्यकतानुसार तकनीकी शब्दों के लिए अंग्रेजी का प्रयोग करें
3. व्यावसायिकता बनाए रखें
4. ${style === 'simple' ? 'केवल मुख्य परिवर्तनों का वर्णन करें' : 
    style === 'normal' ? 'परिवर्तनों का सारांश और प्रमुख प्रभाव बताएं' : 
    'परिवर्तनों और प्रभाव क्षेत्र का विस्तृत विवरण दें'}`,
        diffMessage: 'परिवर्तन निम्नलिखित हैं:'
    },
    bengali: {
        name: 'বাংলা',
        description: 'কমিট বার্তা বাংলায় তৈরি করুন',
        systemPrompt: (style: MessageStyle) => `
অনুগ্রহ করে কমিট বার্তা বাংলায় তৈরি করুন।
অনুগ্রহ করে নিম্নলিখিত নিয়মগুলি অনুসরণ করুন:
1. পরিষ্কার এবং সংক্ষিপ্ত বাংলা ব্যবহার করুন
2. প্রয়োজনে কারিগরি শব্দের জন্য ইংরেজি ব্যবহার করুন
3. পেশাদারিত্ব বজায় রাখুন
4. ${style === 'simple' ? 'শুধুমাত্র মূল পরিবর্তনগুলি বর্ণনা করুন' : 
    style === 'normal' ? 'পরিবর্তনের সারাংশ এবং প্রধান প্রভাব বর্ণনা করুন' : 
    'পরিবর্তন এবং প্রভাবের পরিধি বিস্তারিতভাবে বর্ণনা করুন'}`,
        diffMessage: 'পরিবর্তনগুলি নিম্নরূপ:'
    },
    javanese: {
        name: 'Basa Jawa',
        description: 'Nggawe pesen commit nganggo basa Jawa',
        systemPrompt: (style: MessageStyle) => `
Mangga nggawe pesen commit nganggo basa Jawa.
Mangga nuruti aturan ing ngisor iki:
1. Nggunakake basa Jawa sing cetha lan ringkes
2. Nggunakake tembung teknis ing basa Inggris menawa perlu
3. Njaga profesionalitas
4. ${style === 'simple' ? 'Mung nerangake owahan utama' : 
    style === 'normal' ? 'Nerangake ringkesan lan pangaruh utama' : 
    'Nerangake owahan lan jangkauan pangaruh kanthi detail'}`,
        diffMessage: 'Owahan-owahan kasebut yaiku:'
    },
    tamil: {
        name: 'தமிழ்',
        description: 'கமிட் செய்தியை தமிழில் உருவாக்கவும்',
        systemPrompt: (style: MessageStyle) => `
கமிட் செய்தியை தமிழில் உருவாக்கவும்.
பின்வரும் விதிகளை பின்பற்றவும்:
1. தெளிவான மற்றும் சுருக்கமான தமிழைப் பயன்படுத்தவும்
2. தேவைப்படும்போது தொழில்நுட்ப சொற்களுக்கு ஆங்கிலத்தைப் பயன்படுத்தவும்
3. தொழில்முறை தன்மையை பராமரிக்கவும்
4. ${style === 'simple' ? 'முக்கிய மாற்றங்களை மட்டும் விவரிக்கவும்' : 
    style === 'normal' ? 'மாற்றங்களின் சுருக்கம் மற்றும் முக்கிய தாக்கங்களை விவரிக்கவும்' : 
    'மாற்றங்கள் மற்றும் தாக்கத்தின் அளவை விரிவாக விவரிக்கவும்'}`,
        diffMessage: 'மாற்றங்கள் பின்வருமாறு:'
    },
    burmese: {
        name: 'မြန်မာဘာသာ',
        description: 'ကော်မစ်မက်ဆေ့ချ်အား မြန်မာဘာသာဖြင့်ဖန်တီးပါ',
        systemPrompt: (style: MessageStyle) => `
ကော်မစ်မက်ဆေ့ချ်အား မြန်မာဘာသာဖြင့် ဖန်တီးပေးပါ။
အောက်ပါစည်းမျဉ်းများကို လိုက်နာပါ:
1. ရှင်းလင်းပြီး တိုတောင်းသော မြန်မာစာကို အသုံးပြုပါ
2. လိုအပ်ပါက နည်းပညာဝေါဟာရများအတွက် အင်္ဂလိပ်လို အသုံးပြုပါ
3. ပညာရှင်ဆန်မှုကို ထိန်းသိမ်းပါ
4. ${style === 'simple' ? 'အဓိက ပြောင်းလဲမှုများကိုသာ ဖော်ပြပါ' : 
    style === 'normal' ? 'ပြောင်းလဲမှုများ၏ အကျဉ်းချုပ်နှင့် အဓိက သက်ရောက်မှုများကို ဖော်ပြပါ' : 
    'ပြောင်းလဲမှုများနှင့် သက်ရောက်မှု အတိုင်းအတာကို အသေးစိတ် ဖော်ပြပါ'}`,
        diffMessage: 'ပြောင်းလဲမှုများမှာ အောက်ပါအတိုင်းဖြစ်သည်:'
    }
};