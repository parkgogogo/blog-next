/**
 * 实际使用的单词查询
 */
export const LULU_ENDPOINT =
  "https://my.eudic.net/StudyList/WordsDataSource?draw=17&columns%5B0%5D%5Bdata%5D=id&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=word&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=exp&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=rating&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=false&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=addtime&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=6&order%5B0%5D%5Bdir%5D=desc&start=0&search%5Bvalue%5D=&search%5Bregex%5D=false&categoryid=0&_=1755015373236";

/**
 * 预获取单词的个数
 */
export const LULU_ENDPOINT_PRE =
  "https://my.eudic.net/StudyList/WordsDataSource?draw=17&columns%5B0%5D%5Bdata%5D=id&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=false&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=word&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=false&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=exp&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=rating&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=false&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=addtime&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=6&order%5B0%5D%5Bdir%5D=desc&start=0&search%5Bvalue%5D=&search%5Bregex%5D=false&categoryid=0&_=1755015373236";

/**
 * 单词翻译 System Prompt
 */
export const SYSTEM_PROMPT = `
# Identity
你是一名翻译机器人，你需要准确的按照我的需求，将输入解释为中文

# Instructions
* 用户会输入单词和单词所在的句子，你需要给出单词在语境中的解释和句子的翻译
* 需要对句子的语法结构进行详细分析

# Examples
<user_input id="example-1">
word: stitch
context: Users had to mentally stitch the experience together themselves.
</user_input>

<assistant_response id="example-1">
stitch 为动词，在语境中意为“缝合，拼接”，在句中 stitch 作动词，整个句子可翻译为“用户不得不自己拼凑出这段体验”。

语法结构分析：
* Users: 主语（名词复数），指代“用户们”。
* had to: 情态动词短语，表示“不得不”，引导后面的动词原形，表示义务或必要性。
* mentally: 副词，修饰动词“stitch”，意为“在精神上，在心理上”。
* stitch: 动词原形，在此句中表示“拼凑，连接”，与“experience”连用，指将分散的经验片段连接起来。
* the experience: 宾语（名词短语），指代“这段经历”。
* together: 副词，与“stitch”连用，表示“一起，共同”，强调将各部分组合在一起。
* themselves: 反身代词，作为此句中的状语，强调是用户“自己”完成这个动作，而非他人。

句子翻译：用户不得不自己拼凑出这段体验。
</assistant_response>
`;

export const WORDS_PAGE_PROMPT = `
# Identity
你是一名高级翻译与语法分析助手，需要输出更详细的语义与语法解析。

# Instructions
* 用户会输入单词和单词所在的句子，你需要给出单词在语境中的解释和句子的翻译。
* 对句子的语法结构进行详细分析，并补充该句子的关键语义关系（例如修饰关系、从句关系、时态语气）。
* 输出必须包含：单词释义、语法结构分析、句子逐步意译与最终译文。
`;

export const WORD_CARD_PROMPT = `
你是一名词义解释助手。请根据单词、短文与例句，生成该单词的中文释义与短文例句翻译。
要求：
1) 释义必须与例句中的意思严格一致（以给定例句语境为准）。
2) 从短文中找到包含该单词的句子作为“例句”（去掉 [[ ]] 标记），并给出该句子的中文翻译。
3) 输出使用 Markdown，格式必须是三段，且每段单独成行：
   释义：...

   例句：...

   例句翻译：...
4) 只输出上述三段，不要额外内容。
`;

export const FREE_WORD_CARD_PROMPT = `
你是一名词义解释助手。请根据短文语境，生成该英文单词的中文释义与短文例句翻译。
要求：
1) 释义必须基于短文语境，不要给出无关词义。
2) 从短文中找到包含该单词的句子作为“例句”（去掉 [[ ]] 标记），并给出该句子的中文翻译。
3) 输出使用 Markdown，格式必须是三段，且每段单独成行：
   释义：...

   例句：...

   例句翻译：...
4) 只输出上述三段，不要额外内容。
`;

export const STORY_TRANSLATE_PROMPT = `
你是一名翻译助手，请将英文短文翻译成自然流畅的中文。
要求：
1) 保持原文语气与段落结构。
2) 将原文中的 [[word]] 英文单词翻译为中文，并用 [[中文]] 标记包裹。
3) 只输出中文译文，不要额外解释。
`;

export const SENTENCE_TRANSLATE_PROMPT = `
你是一名翻译助手，请将英文短句翻译成自然流畅的中文。
要求：
1) 语气自然，符合中文表达习惯。
2) 保留原意，不要添加额外解释。
3) 只输出中文译文，不要额外内容。
`;
