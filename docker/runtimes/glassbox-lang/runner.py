import sys,json
sys.path.insert(0,'/compiler-core')
from interpreter import run_program
print(json.dumps(run_program(open('/work/main').read(),open('/work/stdin').read())))
