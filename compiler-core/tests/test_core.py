import sys, pathlib, unittest
sys.path.insert(0, str(pathlib.Path(__file__).parents[1]))
from lexer import tokenize
from parser import parse
from interpreter import run_program

PROGRAMS=[('print(1);','1'),('int x=2; print(x+3);','5'),('float x=2.5; print(x*2);','5.0'),('bool x=true; if(x){print("yes");}else{print("no");}','yes'),('int i=0; while(i<3){print(i);i=i+1;}','0\n1\n2'),('func f(int x): int {return x*x;} print(f(4));','16'),('func fact(int n): int {if(n<=1){return 1;} return n*fact(n-1);} print(fact(5));','120'),('func fib(int n): int {if(n<2){return n;}return fib(n-1)+fib(n-2);} print(fib(8));','21'),('int i=0;while(i<2){int j=0;while(j<2){print(i*10+j);j=j+1;}i=i+1;}','0\n1\n10\n11'),('string a="hi"; print(a+"!");','hi!'),('print(2+3*4==14);','true'),('print(!(false || false));','true'),('func add(int a,int b): int { return a+b; } print(add(3,7));','10'),('int x=1; if(true){print(x);}','1'),('int a=10; int b=3; print(a%b);','1'),('int x=0; if(false){x=1;}else{x=2;} print(x);','2')]
BROKEN=[('int x=true;','cannot assign bool to int'),('print(x);',"undefined variable 'x'"),('if(1){print(1);}','condition must be bool'),('int x=;','expected expression'),('int x=1','expected ;'),('foo();',"undefined function 'foo'"),('func f(int x): int { return x; } print(f());',"expects 1 arguments"),('int x=1; int x=2;','already declared'),('int x=1; x=true;','cannot assign bool to int'),('@','unexpected character')]
class CoreTests(unittest.TestCase):
 def test_lexer(self):
  t=tokenize('// c\nint x = 12;'); self.assertEqual([(x['type'],x['line']) for x in t[:-1]],[('INT',2),('ID',2),('OP',2),('INT',2),(';',2)])
 def test_parser_precedence(self): self.assertEqual(parse('int x=1+2*3;').statements[0].value.op,'+')
 def test_parser_function(self): self.assertEqual(parse('func f(int x): int {return x;}').statements[0].name,'f')
 def test_end_to_end_programs(self):
  for src,out in PROGRAMS:
   with self.subTest(src=src):
    r=run_program(src); self.assertEqual(r['errors'],[]); self.assertEqual(r['output'],out)
 def test_broken_programs(self):
  for src,part in BROKEN:
   with self.subTest(src=src): self.assertIn(part,run_program(src)['errors'][0])
if __name__=='__main__': unittest.main()
