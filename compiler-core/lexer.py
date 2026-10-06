import re

class LexError(Exception): pass

KEYWORDS = {"int","float","bool","string","if","else","while","func","return","print","true","false"}
TOKEN_RE = re.compile(r'''(?P<WS>[ \t\r]+)|(?P<NEWLINE>\n)|(?P<COMMENT>//[^\n]*|#[^\n]*)|(?P<FLOAT>\d+\.\d+)|(?P<INT>\d+)|(?P<STRING>"(?:\\.|[^"\\])*")|(?P<OP>==|!=|<=|>=|&&|\|\||[+\-*/%!<>=])|(?P<PUNC>[(){};,:])|(?P<ID>[A-Za-z_][A-Za-z0-9_]*)''')

def tokenize(source):
    tokens=[]; pos=0; line=1; col=1
    while pos < len(source):
        m=TOKEN_RE.match(source,pos)
        if not m: raise LexError(f"Line {line}, col {col}: unexpected character {source[pos]!r}")
        kind=m.lastgroup; val=m.group(); startcol=col
        pos=m.end(); col += len(val)
        if kind == "NEWLINE": line += 1; col=1; continue
        if kind in ("WS","COMMENT"): continue
        if kind == "ID" and val in KEYWORDS: kind=val.upper()
        elif kind == "PUNC": kind=val
        tokens.append({"type":kind,"value":val,"line":line,"col":startcol})
    tokens.append({"type":"EOF","value":"","line":line,"col":col})
    return tokens
