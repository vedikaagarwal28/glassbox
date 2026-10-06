"""AST definitions for glassbox-lang."""
from dataclasses import dataclass, field, asdict
from typing import Any

@dataclass
class Node:
    line: int
    def tree(self):
        def conv(v):
            if isinstance(v, Node): return v.tree()
            if isinstance(v, list): return [conv(x) for x in v]
            return v
        data = {k: conv(v) for k, v in self.__dict__.items() if k != "line"}
        children = []
        for v in data.values():
            if isinstance(v, dict) and "type" in v: children.append(v)
            elif isinstance(v, list): children.extend(x for x in v if isinstance(x, dict) and "type" in x)
        return {"type": type(self).__name__, "line": self.line, "children": children, **data}

@dataclass
class Program(Node): statements: list
@dataclass
class Block(Node): statements: list
@dataclass
class VarDecl(Node): name: str; declared_type: str; value: Any
@dataclass
class Assign(Node): name: str; value: Any
@dataclass
class If(Node): condition: Any; then_branch: Any; else_branch: Any = None
@dataclass
class While(Node): condition: Any; body: Any
@dataclass
class Function(Node): name: str; params: list; return_type: str; body: Any
@dataclass
class Return(Node): value: Any
@dataclass
class Print(Node): value: Any
@dataclass
class ExprStmt(Node): expression: Any
@dataclass
class Binary(Node): left: Any; op: str; right: Any
@dataclass
class Unary(Node): op: str; operand: Any
@dataclass
class Literal(Node): value: Any; literal_type: str
@dataclass
class Variable(Node): name: str
@dataclass
class Call(Node): callee: str; args: list
