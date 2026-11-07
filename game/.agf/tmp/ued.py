import re, sys, json
P='src/game/units.ts'
def load(): return open(P).read()
def block(s, uid):
    m = re.search(r"\n    id: %d, ch:" % uid, s); a = m.start()
    b = s.index("\n  },", a)
    return a, b
def setline(uid, prefix, new, sub=None):
    """replace the line in unit uid that starts with prefix; sub=(old,new) does a substring replace in it"""
    s = load(); a, b = block(s, uid); blk = s[a:b]
    lines = blk.split("\n"); hit = 0
    for i, l in enumerate(lines):
        if l.startswith(prefix):
            lines[i] = (l.replace(sub[0], sub[1]) if sub else new); hit += 1
            if sub: assert sub[0] in l, (uid, sub[0])
    assert hit == 1, (uid, prefix, hit)
    open(P, 'w').write(s[:a] + "\n".join(lines) + s[b:])
