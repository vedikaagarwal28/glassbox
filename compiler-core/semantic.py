from ast_nodes import *
class SemanticError(Exception): pass

class Checker:
 def __init__(self): self.scopes=[{}]; self.funcs={}
 def err(self,n,msg): raise SemanticError(f"Line {n.line}: {msg}")
 def lookup(self,n,name):
  for s in reversed(self.scopes):
   if name in s:return s[name]
  self.err(n,f"undefined variable '{name}'")
 def check(self,n):
  if isinstance(n,Program):
   for x in n.statements: self.check(x)
  elif isinstance(n,Block):
   self.scopes.append({}); [self.check(x) for x in n.statements]; self.scopes.pop()
  elif isinstance(n,VarDecl):
   if n.name in self.scopes[-1]: self.err(n,f"variable '{n.name}' already declared")
   t=self.check(n.value)
   if t != n.declared_type and not (n.declared_type=='float' and t=='int'): self.err(n,f"cannot assign {t} to {n.declared_type}")
   self.scopes[-1][n.name]=n.declared_type
  elif isinstance(n,Assign):
   old=self.lookup(n,n.name); new=self.check(n.value)
   if old != new and not (old=='float' and new=='int'): self.err(n,f"cannot assign {new} to {old}")
  elif isinstance(n,(If,While)):
   if self.check(n.condition)!='bool': self.err(n,'condition must be bool')
   self.check(n.then_branch if isinstance(n,If) else n.body)
   if isinstance(n,If) and n.else_branch:self.check(n.else_branch)
  elif isinstance(n,Function):
   if n.name in self.funcs:self.err(n,f"function '{n.name}' already declared")
   self.funcs[n.name]=n; self.scopes.append(dict(n.params)); self.check(n.body); self.scopes.pop()
  elif isinstance(n,Return): self.check(n.value)
  elif isinstance(n,Print): self.check(n.value)
  elif isinstance(n,ExprStmt): self.check(n.expression)
  elif isinstance(n,Variable): return self.lookup(n,n.name)
  elif isinstance(n,Literal): return n.literal_type
  elif isinstance(n,Call):
   if n.callee not in self.funcs: self.err(n,f"undefined function '{n.callee}'")
   f=self.funcs[n.callee]
   if len(n.args)!=len(f.params):self.err(n,f"function '{n.callee}' expects {len(f.params)} arguments")
   for a,(_,pt) in zip(n.args,f.params):
    if self.check(a)!=pt:self.err(a,f"argument type must be {pt}")
   return f.return_type
  elif isinstance(n,Unary):
   t=self.check(n.operand); return 'bool' if n.op=='!' else t
  elif isinstance(n,Binary):
   a,b=self.check(n.left),self.check(n.right)
   if n.op in ('==','!=','<','>','<=','>=','&&','||'): return 'bool'
   if n.op=='+' and a==b=='string': return 'string'
   if a not in ('int','float') or b not in ('int','float'): self.err(n,'arithmetic operands must be numbers')
   return 'float' if 'float' in (a,b) else 'int'
def check(program): Checker().check(program)
