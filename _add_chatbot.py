# -*- coding: utf-8 -*-
"""Nhúng khung chat vào toàn bộ trang của website.

Chạy lại được nhiều lần, trang nào đã có thì bỏ qua.
    python _add_chatbot.py
"""
import re, glob, os

SCRIPT = '<script id="dbv-chatbot" src="/assets/dbv-chatbot.js" defer></script>'

# Netlify chỉ ghi nhận form nào nó thấy trong HTML lúc build. Form ẩn này chính
# là cửa để lead từ chatbot chảy vào cùng đường ống với các form khác, nhờ đó
# dashboard CRM hiện được luôn mà không phải sửa gì bên đó.
HIDDEN_FORM = '''<form name="chatbot-lead" data-netlify="true" hidden id="dbv-chatbot-form">
  <input type="text" name="name"><input type="tel" name="phone">
  <input type="text" name="need"><input type="text" name="page">
  <textarea name="transcript"></textarea>
</form>'''

SKIP_NAMES = {'google067cc8913a387cda.html', 'index-test.html',
              'bao-hiem-du-lich-quoc-te-demo.html'}
SKIP_DIRS = {'admin', 'node_modules', 'Originals', '_skill-build', 'netlify'}

files = []
for f in glob.glob('**/*.html', recursive=True):
    f = f.replace('\\', '/')
    if os.path.basename(f) in SKIP_NAMES:
        continue
    if any(f.startswith(d + '/') for d in SKIP_DIRS):
        continue
    files.append(f)

added, skipped, missing = 0, 0, []
for f in sorted(files):
    c = open(f, encoding='utf-8').read()
    if '</body>' not in c:
        missing.append(f)
        continue

    block = ''
    if 'id="dbv-chatbot"' not in c:
        block += SCRIPT + '\n'
    # Form ẩn chỉ cần nằm ở trang chủ là đủ để Netlify đăng ký form
    if f == 'index.html' and 'name="chatbot-lead"' not in c:
        block = HIDDEN_FORM + '\n' + block

    if not block:
        skipped += 1
        continue

    c = c.replace('</body>', block + '</body>', 1)
    open(f, 'w', encoding='utf-8').write(c)
    added += 1

print('Da them : %d trang' % added)
print('Da co   : %d trang' % skipped)
if missing:
    print('Thieu </body>: %s' % ', '.join(missing))
