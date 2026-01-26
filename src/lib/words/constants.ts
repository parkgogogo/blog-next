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

export const WORD_CARD_BUNDLE_PROMPT = `
你是一名词义解释与语法分析助手。请根据目标单词与给定英文内容输出一个 JSON，包含智能上下文、简解与详解。
要求：
1) 必须输出 JSON，且只输出 JSON，不要多余解释。
2) JSON 结构固定：{"context":"...","brief":"...","detail":"..."}
3) context 必须是英文，来自给定内容中包含该单词的最相关句子或短语，必须包含该单词（大小写可不同），长度不超过 max_chars。
4) brief 使用 Markdown，格式严格为三段，段与段之间空一行，且每段单独成行：
   释义：...（不超过 20 字，只解释单词在 context 中的意思）

   例句：...（必须与 context 完全一致）

   例句翻译：...（必须是 context 的中文翻译）
5) detail 使用 Markdown，格式严格为五段，段与段之间空一行，且每段单独成行：
   释义：...（完整、准确）

   例句：...（一句话）

   例句翻译：...（一句话）

   语法要点：1) ...；2) ...（至少两条）

   语义补充：1) ...；2) ...（至少两条）
6) brief 必须短、只保留核心信息；detail 必须补充语法与语义差异，体现深度。
7) 除“语法要点/语义补充”中的 1) 2) 之外，不要使用项目符号或列表。
8) 如果输入内容包含 [[word]] 标记，输出 context 与例句时去掉 [[ ]]。
`;

export const PASSAGE_TRANSLATE_PROMPT = `
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

export const CONTEXT_SNIPPET_PROMPT = `
你是一名语境截取助手。根据目标单词与给定英文内容，找出包含该单词的最相关句子或短语，输出一条简洁的英文上下文。
要求：
1) 输出必须包含目标单词，大小写允许变化，但必须是原单词。
2) 只输出英文上下文，不要加引号、标点说明或额外解释。
3) 控制在指定长度以内，优先保留语义完整的句子片段。
`;
