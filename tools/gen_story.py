#!/usr/bin/env python3
"""Generate js/story.js from original.txt — paragraphs copied verbatim, no edits.
Inserts only display commands (bg/music/chapter/choice). Choices carry no
reaction text and never branch; the engine is linear by construction."""
import json, sys

SRC = 'original.txt'
DST = 'game/js/story.js'

with open(SRC, encoding='utf-8') as f:
    text = f.read()
paras = [p for p in text.split('\n\n') if p.strip()]

CHAPTERS = {'引子', '一、那对夫妻', '二、邻居', '三、她', '四、面对面', '尾声'}

# commands inserted BEFORE the paragraph whose text starts with the key
BEFORE = {
    '我小的时候，家住齐齐哈尔': [{'bg': 'train', 'music': 'train'}],
    '下车的时候是深夜': [{'bg': 'station', 'music': 'train'}],
    '我想起了一个邻居，姓赵': [{'bg': 'oldhouse'}],
    '赵蔓红被送进了医院。': [{'bg': 'hospital'}],
    '不知道为什么，所有人都知道这事儿是我干的': [{'bg': 'oldhouse'}],
    '那是高考的第一天': [{'bg': 'examday'}],
    '赵家办完丧事之后': [{'bg': 'oldhouse'}],
    '次日上午，我去了赵叔工作的那家工厂': [{'bg': 'courtyard', 'music': 'home'}],
    '我按响了门铃': [{'bg': 'livingroom'}],
    '我躺下了。': [{'bg': 'girlroom'}],
    '第二天天一亮': [{'bg': 'livingroom', 'music': 'reveal'}],
    '天一直阴着，却没有雨': [{'bg': 'courtyard'}],
    '雨点终于稀稀拉拉掉下来了': [{'bg': 'rain'}],
    '她同意了，跟我走向了小区外的一家咖啡馆': [{'bg': 'cafe'}],
    '雨越下越大了。': [{'bg': 'rain'}],
    '现在，我说说我为什么忽然想到了整容的问题': [{'bg': 'attic', 'music': 'finale'}],
}
# cosmetic choices inserted AFTER the paragraph whose text starts with the key
AFTER = {
    '我清醒过来之后，那对夫妻已经夹杂在': [[{'t': '下车'}, {'t': '留在车上'}]],
    '那一天，我在学校里一直晕晕乎乎': [[{'t': '接受'}, {'t': '拒绝'}]],
    '赵婶一下就拽住我的手': [[{'t': '住一宿'}, {'t': '去赶火车'}]],
    '最后，我盯住了写字桌的抽屉': [[{'t': '打开看看'}, {'t': '算了'}]],
}

def find_unique(prefix):
    hits = [i for i, p in enumerate(paras) if p.startswith(prefix)]
    if len(hits) != 1:
        sys.exit(f'ANCHOR NOT UNIQUE/FOUND: {prefix!r} -> {len(hits)} hits')
    return hits[0]

before_idx = {find_unique(k): v for k, v in BEFORE.items()}
after_idx = {find_unique(k): v for k, v in AFTER.items()}

def emit(obj):
    # compact single-line JS object literal, strings via JSON (valid JS)
    parts = []
    for k, v in obj.items():
        if k == 'choice':
            opts = ','.join('{t:' + json.dumps(o['t'], ensure_ascii=False) + '}' for o in v)
            parts.append(f'choice:[{opts}]')
        elif isinstance(v, bool):
            parts.append(f'{k}:{str(v).lower()}')
        else:
            parts.append(f'{k}:{json.dumps(v, ensure_ascii=False)}')
    return '    {' + ', '.join(parts) + '},'

lines = []
lines.append('/* whoamI — 剧情脚本：正文逐字取自 original.txt，仅插入显示指令。')
lines.append('   选项为形式选项（无反应文字），选择后剧情线性继续，不分支、无多结局。 */')
lines.append('const STORY = {')
lines.append('  start: [')
lines.append("    {bg:'title', music:'title'},")
n_count = 0
for i, p in enumerate(paras):
    if p in CHAPTERS:
        lines.append(emit({'chapter': p}))
        continue
    for cmd in before_idx.get(i, []):
        lines.append(emit(cmd))
    lines.append(emit({'n': p}))
    n_count += 1
    for ch in after_idx.get(i, []):
        lines.append(emit({'choice': ch}))
lines.append('    {end:true},')
lines.append('  ],')
lines.append('};')
with open(DST, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')
print(f'paragraphs={len(paras)} narration_entries={n_count} chapters={len(CHAPTERS)}')
