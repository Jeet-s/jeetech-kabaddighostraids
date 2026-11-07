import re, sys, json
p = 'src/game/units.ts'
s = open(p).read()
def block_span(uid):
    m = re.search(r'\n  \{\n    id: %d, ' % uid, s)
    assert m, uid
    st = m.start() + 1
    en = s.index('\n  },\n', st) + len('\n  },\n')
    return st, en
def get(uid):
    a, b = block_span(uid); return s[a:b]
def put(uid, text):
    global s
    a, b = block_span(uid); s = s[:a] + text.strip('\n') + '\n' + s[b:]
