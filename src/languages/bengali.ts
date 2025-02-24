import { PromptType } from '../types/language';

export const getBengaliPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
আপনি একজন অভিজ্ঞ সফটওয়্যার ইঞ্জিনিয়ার যিনি কমিট মেসেজ এবং PR তৈরিতে সহায়তা করেন।
আপনার আউটপুটের বৈশিষ্ট্য:

- বাংলায় স্পষ্ট লেখা
- কারিগরিভাবে সঠিক অভিব্যক্তি
- পরিবর্তনের উপযুক্ত সারসংক্ষেপ
`,
        commit: `
প্রদত্ত diff এর ভিত্তিতে, {{style}} স্টাইলে একটি কমিট মেসেজ তৈরি করুন।

স্টাইলের বর্ণনা:
- normal: স্ট্যান্ডার্ড টেকনিক্যাল রাইটিং
- emoji: ইমোজি সহ বন্ধুত্বপূর্ণ টোন
- kawaii: মিষ্টি এবং বন্ধুত্বপূর্ণ টোন

Diff:
{{diff}}
`,
        prTitle: `
নিম্নলিখিত diff এর ভিত্তিতে, Pull Request এর জন্য একটি শিরোনাম তৈরি করুন।

প্রয়োজনীয়তা:
1. শিরোনাম সংক্ষিপ্ত হওয়া উচিত এবং পরিবর্তনগুলি সঠিকভাবে প্রতিনিধিত্ব করা উচিত
2. প্রিফিক্স অন্তর্ভুক্ত করুন (উদাহরণ: "feat:", "fix:", "উন্নতি:", ইত্যাদি)
3. বাংলায় লিখুন

Diff:
{{diff}}
`,
        prBody: `
নিম্নলিখিত diff এর ভিত্তিতে, Pull Request এর জন্য একটি বিস্তারিত বর্ণনা তৈরি করুন।

প্রয়োজনীয়তা:
1. বর্ণনায় অন্তর্ভুক্ত থাকা উচিত:
   - পরিবর্তনের সামগ্রিক দৃষ্টিভঙ্গি
   - সংশোধনের উদ্দেশ্য
   - প্রভাবের পরিধি
   - পরীক্ষার নির্দেশাবলী (যদি প্রয়োজন হয়)
2. বাংলায় লিখুন
3. পঠনযোগ্যতা বাড়াতে বুলেট পয়েন্ট ব্যবহার করুন

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};