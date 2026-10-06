import time
from ast_nodes import *
from lexer import tokenize, LexError
from parser import parse, ParseError
from semantic import check, SemanticError

class RuntimeError_(Exception): pass
class ReturnSignal(Exception):
 def __init__(self,v):self.value=v
class Env:
 def __init__(self,parent=None):self.values={};self.parent=parent
 def get(self,n):
  if n in self.values:return self.values[n]
  if self.parent:return self.parent.get(n)
  raise RuntimeError_(f"undefined variable '{n}'")
 def set(self,n,v):
  if n in self.values:self.values[n]=v
  elif self.parent:self.parent.set(n,v)
  else:raise RuntimeError_(f"undefined variable '{n}'")
 def snapshot(self):
  d=self.parent.snapshot() if self.parent else {}; d.update(self.values); return d
class Interpreter:
 def __init__(self):self.global_=Env();self.output=[];self.trace=[]
 def step(self,n,desc,env):self.trace.append({'line':n.line,'node':desc,'variables':self.clean(env.snapshot())})
 def clean(self,d):return {k:v for k,v in d.items() if not isinstance(v,Function)}
 def run(self,p):
  for s in p.statements:self.exec(s,self.global_)
 def exec(self,n,e):
  if isinstance(n,Block):
   local=Env(e)
   for s in n.statements:self.exec(s,local)
  elif isinstance(n,VarDecl): self.step(n,'declare '+n.name,e);e.values[n.name]=self.eval(n.value,e)
  elif isinstance(n,Assign): self.step(n,'assign '+n.name,e);e.set(n.name,self.eval(n.value,e))
  elif isinstance(n,Print): self.step(n,'print',e);self.output.append(self.format(self.eval(n.value,e)))
  elif isinstance(n,ExprStmt): self.step(n,'expression',e);self.eval(n.expression,e)
  elif isinstance(n,If): self.step(n,'if',e);self.exec(n.then_branch if self.eval(n.condition,e) else n.else_branch,e) if (self.eval(n.condition,e) or n.else_branch) else None
  elif isinstance(n,While):
   while self.eval(n.condition,e):self.step(n,'while iteration',e);self.exec(n.body,e)
  elif isinstance(n,Function):self.step(n,'define function '+n.name,e);e.values[n.name]=n
  elif isinstance(n,Return):self.step(n,'return',e);raise ReturnSignal(self.eval(n.value,e))
 def eval(self,n,e):
  if isinstance(n,Literal):return n.value
  if isinstance(n,Variable):return e.get(n.name)
  if isinstance(n,Unary):return not self.eval(n.operand,e) if n.op=='!' else -self.eval(n.operand,e)
  if isinstance(n,Binary):
   a=self.eval(n.left,e); b=self.eval(n.right,e); return {'+':lambda:a+b,'-':lambda:a-b,'*':lambda:a*b,'/':lambda:a/b,'%':lambda:a%b,'==':lambda:a==b,'!=':lambda:a!=b,'<':lambda:a<b,'>':lambda:a>b,'<=':lambda:a<=b,'>=':lambda:a>=b,'&&':lambda:a and b,'||':lambda:a or b}[n.op]()
  if isinstance(n,Call):
   f=e.get(n.callee); vals=[self.eval(a,e) for a in n.args]; local=Env(e)
   for (name,_),v in zip(f.params,vals):local.values[name]=v
   self.step(n,'call '+n.callee,e)
   try:self.exec(f.body,local)
   except ReturnSignal as r:return r.value
   return None
 def format(self,v):return 'true' if v is True else 'false' if v is False else str(v)

def run_program(source:str, stdin:str='')->dict:
 start=time.perf_counter(); tokens=[]; tree=None; output=''; trace=[]; errors=[]
 try:
  tokens=tokenize(source); p=parse(source); tree=p.tree(); check(p); i=Interpreter(); i.run(p); output='\n'.join(i.output); trace=i.trace
 except (LexError,ParseError,SemanticError,RuntimeError_,ZeroDivisionError) as ex: errors=[str(ex)]
 return {'tokens':tokens[:-1], 'ast':tree, 'output':output, 'errors':errors, 'trace':trace, 'execution_time_ms':round((time.perf_counter()-start)*1000,3)}
