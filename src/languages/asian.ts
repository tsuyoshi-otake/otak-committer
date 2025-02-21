import type { LanguageConfig } from '../types/language';
import type { MessageStyle } from '../types/messageStyle';
import { COMMIT_PREFIX_GUIDE } from '../constants/commitGuide';

export const asianLanguages: Record<string, LanguageConfig> = {
    japanese: {
        name: '日本語',
        systemPrompt: (style: MessageStyle) => `あなたはコミットメッセージを生成する専門家です。${style} 以下のプレフィックスを使用してConventional Commits形式に従ってください：${COMMIT_PREFIX_GUIDE}
コミットメッセージはMarkdown形式を使用せず、プレーンテキストとして出力してください。適切な改行を使用し、Gitのコミットメッセージとして直接使用できる形式にしてください。
日本語で生成してください。`,
        diffMessage: "以下のGit diffに対するコミットメッセージを生成してください。Markdown形式ではなくプレーンテキストで出力してください："
    },
    chinese: {
        name: '中文',
        systemPrompt: (style: MessageStyle) => `您是提交消息专家。${style} 请按照Conventional Commits格式使用以下前缀：${COMMIT_PREFIX_GUIDE}
以纯文本格式输出提交消息，不使用Markdown格式。使用适当的换行符，使其适合直接用于Git提交。
请使用中文生成。`,
        diffMessage: "为以下Git差异生成提交消息，并以纯文本（不使用Markdown格式）输出："
    },
    traditionalChinese: {
        name: '繁體中文',
        systemPrompt: (style: MessageStyle) => `您是提交訊息專家。${style} 請按照Conventional Commits格式使用以下前綴：${COMMIT_PREFIX_GUIDE}
以純文字格式輸出提交訊息，不使用Markdown格式。使用適當的換行符，使其適合直接用於Git提交。
請使用繁體中文生成。`,
        diffMessage: "為以下Git差異生成提交訊息，並以純文字（不使用Markdown格式）輸出："
    },
    korean: {
        name: '한국어',
        systemPrompt: (style: MessageStyle) => `당신은 커밋 메시지 전문가입니다. ${style} Conventional Commits 형식과 다음 접두사를 사용하세요:${COMMIT_PREFIX_GUIDE}
커밋 메시지를 Markdown 형식 없이 일반 텍스트로 출력하세요. 적절한 줄바꿈을 사용하고 Git 커밋에 직접 사용하기 적합한 형식으로 만드세요.
한국어로 생성해 주세요.`,
        diffMessage: "다음 Git diff에 대한 커밋 메시지를 생성하세요. Markdown 형식이 아닌 일반 텍스트로 출력하세요:"
    },
    vietnamese: {
        name: 'Tiếng Việt',
        systemPrompt: (style: MessageStyle) => `Bạn là chuyên gia về tin nhắn commit. ${style} Sử dụng định dạng Conventional Commits với các tiền tố sau:${COMMIT_PREFIX_GUIDE}
Xuất tin nhắn commit dưới dạng văn bản thuần túy không có định dạng Markdown. Sử dụng ngắt dòng phù hợp và làm cho nó phù hợp để sử dụng trực tiếp trong Git commit.
Vui lòng tạo bằng Tiếng Việt.`,
        diffMessage: "Tạo tin nhắn commit cho Git diff sau, và xuất dưới dạng văn bản thuần túy (không có định dạng Markdown):"
    },
    thai: {
        name: 'ไทย',
        systemPrompt: (style: MessageStyle) => `คุณเป็นผู้เชี่ยวชาญด้านข้อความคอมมิต ${style} ใช้รูปแบบ Conventional Commits ด้วยคำนำหน้าเหล่านี้:${COMMIT_PREFIX_GUIDE}
สร้างข้อความคอมมิตเป็นข้อความธรรมดาโดยไม่มีการจัดรูปแบบ Markdown ใช้การขึ้นบรรทัดใหม่ที่เหมาะสมและทำให้เหมาะสำหรับการใช้งานโดยตรงใน Git commit
กรุณาสร้างเป็นภาษาไทย`,
        diffMessage: "สร้างข้อความคอมมิตสำหรับ Git diff ต่อไปนี้เป็นข้อความธรรมดา (ไม่มีการจัดรูปแบบ Markdown):"
    },
    hindi: {
        name: 'हिन्दी',
        systemPrompt: (style: MessageStyle) => `आप एक कमिट संदेश विशेषज्ञ हैं। ${style} इन प्रीफ़िक्स के साथ Conventional Commits प्रारूप का उपयोग करें:${COMMIT_PREFIX_GUIDE}
कमिट संदेश को मार्कडाउन फ़ॉर्मेटिंग के बिना प्लेन टेक्स्ट के रूप में आउटपुट करें। उचित लाइन ब्रेक का उपयोग करें और इसे Git कमिट में सीधे उपयोग के लिए उपयुक्त बनाएं।
कृपया हिन्दी में जनरेट करें।`,
        diffMessage: "निम्नलिखित Git diff के लिए एक कमिट संदेश जनरेट करें, प्लेन टेक्स्ट के रूप में (मार्कडाउन फ़ॉर्मेटिंग के बिना):"
    },
    bengali: {
        name: 'বাংলা',
        systemPrompt: (style: MessageStyle) => `আপনি একজন কমিট মেসেজ বিশেষজ্ঞ। ${style} এই প্রিফিক্সগুলির সাথে Conventional Commits ফরম্যাট ব্যবহার করুন:${COMMIT_PREFIX_GUIDE}
কমিট মেসেজটি মার্কডাউন ফরম্যাটিং ছাড়া প্লেইন টেক্সট হিসাবে আউটপুট করুন। উপযুক্ত লাইন ব্রেক ব্যবহার করুন এবং এটিকে Git কমিটে সরাসরি ব্যবহারের জন্য উপযুক্ত করুন।
অনুগ্রহ করে বাংলায় জেনারেট করুন।`,
        diffMessage: "নিম্নলিখিত Git diff-এর জন্য একটি কমিট মেসেজ জেনারেট করুন, প্লেইন টেক্সট হিসাবে (মার্কডাউন ফরম্যাটিং ছাড়া):"
    },
    javanese: {
        name: 'Basa Jawa',
        systemPrompt: (style: MessageStyle) => `Sampeyan ahli pesen commit. ${style} Gunakake format Conventional Commits karo prefix iki:${COMMIT_PREFIX_GUIDE}
Output pesen commit minangka teks biasa tanpa formatting Markdown. Gunakake garis anyar sing cocok lan dadekake cocog kanggo langsung digunakake ing Git commit.
Mangga generasi ing basa Jawa.`,
        diffMessage: "Generasi pesen commit kanggo Git diff ing ngisor iki minangka teks biasa (tanpa formatting Markdown):"
    },
    tamil: {
        name: 'தமிழ்',
        systemPrompt: (style: MessageStyle) => `நீங்கள் ஒரு கமிட் செய்தி நிபுணர். ${style} இந்த முன்னொட்டுகளுடன் Conventional Commits வடிவத்தைப் பயன்படுத்தவும்:${COMMIT_PREFIX_GUIDE}
கமிட் செய்தியை மார்க்டவுன் வடிவமைப்பு இல்லாமல் சாதாரண உரையாக வெளியிடவும். பொருத்தமான வரி முறிவுகளைப் பயன்படுத்தி, Git கமிட்டில் நேரடியாகப் பயன்படுத்த ஏற்றதாக மாற்றவும்.
தயவுசெய்து தமிழில் உருவாக்கவும்.`,
        diffMessage: "பின்வரும் Git diff-க்கான கமிட் செய்தியை சாதாரண உரையாக உருவாக்கவும் (மார்க்டவுன் வடிவமைப்பு இல்லாமல்):"
    },
    burmese: {
        name: 'မြန်မာဘာသာ',
        systemPrompt: (style: MessageStyle) => `သင်သည် commit message ကျွမ်းကျင်သူတစ်ဦးဖြစ်သည်။ ${style} အောက်ပါ prefix များဖြင့် Conventional Commits ပုံစံကို အသုံးပြုပါ:${COMMIT_PREFIX_GUIDE}
Commit message ကို Markdown formatting မပါဘဲ plain text အနေဖြင့် ထုတ်ပေးပါ။ သင့်လျော်သော line break များသုံး၍ Git commit တွင် တိုက်ရိုက်အသုံးပြုရန် သင့်လျော်အောင် ပြုလုပ်ပါ။
ကျေးဇူးပြု၍ မြန်မာဘာသာဖြင့် ဖန်တီးပေးပါ။`,
        diffMessage: "အောက်ပါ Git diff အတွက် commit message တစ်ခုကို plain text အနေဖြင့် ဖန်တီးပေးပါ (Markdown formatting မပါဘဲ):"
    }
};

export const asianLanguageDescriptions: Record<string, string> = {
    japanese: 'Japanese',
    chinese: 'Chinese',
    traditionalChinese: 'Traditional Chinese',
    korean: 'Korean',
    vietnamese: 'Vietnamese',
    thai: 'Thai',
    hindi: 'Hindi',
    bengali: 'Bengali',
    javanese: 'Javanese',
    tamil: 'Tamil',
    burmese: 'Burmese'
};