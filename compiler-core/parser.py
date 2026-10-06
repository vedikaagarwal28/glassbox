from lexer import tokenize, LexError
from ast_nodes import *

class ParseError(Exception): pass
class Parser:
 def __init__(self, source): self.tokens=tokenize(source); self.i=0
 def cur(self): return self.tokens[self.i]
 def match(self,*types):
  if self.cur()['type'] in types or self.cur()['value'] in types: t=self.cur(); self.i+=1; return t
  return None
 def need(self,t,msg=None):
  got=self.match(t)
  if not got: raise ParseError(f"Line {self.cur()['line']}: {msg or 'expected '+t+', got '+self.cur()['type']}")
  return got
 def program(self):
  sts=[]
  while self.cur()['type']!='EOF': sts.append(self.statement())
  return Program(1,sts)
 def block(self):
  t=self.need('{'); sts=[]
  while self.cur()['type']!='}':
   if self.cur()['type']=='EOF': raise ParseError(f"Line {self.cur()['line']}: expected }}")
   sts.append(self.statement())
  self.need('}'); return Block(t['line'],sts)
 def statement(self):
  t=self.cur(); typ=t['type']
  if typ in ('INT','FLOAT','BOOL','STRING'):
   self.i+=1; name=self.need('ID','expected variable name'); self.need('='); v=self.expr(); self.need(';'); return VarDecl(t['line'],name['value'],t['value'],v)
  if typ=='IF':
   self.i+=1; self.need('('); c=self.expr(); self.need(')'); yes=self.block(); no=None
   if self.match('ELSE'): no=self.block()
   return If(t['line'],c,yes,no)
  if typ=='WHILE':
   self.i+=1; self.need('('); c=self.expr(); self.need(')'); return While(t['line'],c,self.block())
  if typ=='FUNC':
   self.i+=1; name=self.need('ID'); self.need('('); params=[]
   if self.cur()['type']!=')':
    while True:
     pt=self.cur();
     if pt['type'] not in ('INT','FLOAT','BOOL','STRING'): raise ParseError(f"Line {pt['line']}: expected parameter type")
     self.i+=1; pn=self.need('ID'); params.append((pn['value'],pt['value']))
     if not self.match(','): break
   self.need(')'); ret='void'
   if self.match(':'):
    rt=self.cur()
    if rt['type'] not in ('INT','FLOAT','BOOL','STRING','ID'): raise ParseError(f"Line {rt['line']}: expected return type")
    self.i+=1; ret=rt['value']
   return Function(t['line'],name['value'],params,ret,self.block())
  if typ=='RETURN': self.i+=1; v=self.expr(); self.need(';'); return Return(t['line'],v)
  if typ=='PRINT':
   self.i+=1; self.need('('); v=self.expr(); self.need(')'); self.need(';'); return Print(t['line'],v)
  if typ=='ID' and self.tokens[self.i+1]['value']=='=':
   self.i+=1; self.need('='); v=self.expr(); self.need(';'); return Assign(t['line'],t['value'],v)
  e=self.expr(); self.need(';'); return ExprStmt(t['line'],e)
 def expr(self): return self.or_()
 def or_(self): return self.bin(self.and_,('||',))
 def and_(self): return self.bin(self.equality,('&&',))
 def equality(self): return self.bin(self.comparison,('==','!='))
 def comparison(self): return self.bin(self.term,('<','>','<=','>='))
 def term(self): return self.bin(self.factor,('+','-'))
 def factor(self): return self.bin(self.unary,('*','/','%'))
 def bin(self,next_,ops):
  x=next_()
  while self.cur()['type']=='OP' and self.cur()['value'] in ops:
   t=self.cur(); self.i+=1; x=Binary(t['line'],x,t['value'],next_())
  return x
 def unary(self):
  if self.cur()['type']=='OP' and self.cur()['value'] in ('!','-'):
   t=self.cur();self.i+=1;return Unary(t['line'],t['value'],self.unary())
  return self.primary()
 def primary(self):
  t=self.cur(); self.i+=1
  if t['type']=='INT': return Literal(t['line'],int(t['value']),'int')
  if t['type']=='FLOAT': return Literal(t['line'],float(t['value']),'float')
  if t['type']=='STRING': return Literal(t['line'],bytes(t['value'][1:-1],'utf8').decode('unicode_escape'),'string')
  if t['type'] in ('TRUE','FALSE'): return Literal(t['line'],t['type']=='TRUE','bool')
  if t['type']=='ID':
   if self.match('('):
    args=[]
    if self.cur()['type']!=')':
     while True:
      args.append(self.expr())
      if not self.match(','): break
    self.need(')'); return Call(t['line'],t['value'],args)
   return Variable(t['line'],t['value'])
  if t['type']=='(':
   e=self.expr(); self.need(')'); return e
  raise ParseError(f"Line {t['line']}: expected expression")
def parse(source): return Parser(source).program()
