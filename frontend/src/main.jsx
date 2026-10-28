import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api';
const languages = {
  python: { label: 'Python', editor: 'python', code: 'print("Hello, GlassBox!")' },
  c: { label: 'C', editor: 'c', code: '#include <stdio.h>\nint main(){ puts("Hello, GlassBox!"); }' },
  java: { label: 'Java', editor: 'java', code: 'class Main { public static void main(String[] a){System.out.println("Hello, GlassBox!");}}' },
  node: { label: 'Node.js', editor: 'javascript', code: 'console.log("Hello, GlassBox!")' },
  'glassbox-lang': { label: 'glassbox-lang', editor: 'plaintext', code: 'int n = 5;\nfunc fact(int x): int {\n  if (x <= 1) { return 1; }\n  return x * fact(x - 1);\n}\nprint(fact(n));' }
};

function Tree({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;
  const children = node.children || [];
  return <div className="tree-node" style={{ '--depth': depth }}>
    <button className="tree-label" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="tree-caret">{children.length ? (open ? '−' : '+') : '·'}</span>
      <span>{node.type}</span>{node.name && <span className="muted"> {node.name}</span>}
    </button>
    {open && children.map((child, index) => <Tree key={`${child.type}-${index}`} node={child} depth={depth + 1} />)}
  </div>;
}

function Auth({ onToken }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const response = await fetch(`${API}/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || 'Unable to authenticate');
    else { localStorage.token = data.token; onToken(data.token); }
  };
  return <form className="auth-form" onSubmit={submit}>
    <input aria-label="Email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
    <input aria-label="Password" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" />
    {error && <p className="error-text">{error}</p>}
    <button className="button primary" type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
    <button className="text-button" type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'New here? Sign up' : 'Already have an account? Log in'}</button>
  </form>;
}

function App() {
  const sharedId = location.pathname.match(/^\/snippet\/([^/]+)/)?.[1];
  const [language, setLanguage] = useState('glassbox-lang');
  const [code, setCode] = useState(languages['glassbox-lang'].code);
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('Output');
  const [step, setStep] = useState(0);
  const [token, setToken] = useState(localStorage.token || '');
  const [authOpen, setAuthOpen] = useState(false);
  const [shareLoaded, setShareLoaded] = useState(false);
  const visualTabs = language === 'glassbox-lang' ? ['Tokens', 'AST', 'Trace'] : [];
  const tabs = ['Output', 'Errors', ...visualTabs];
  const trace = result?.trace || [];
  const current = trace[step] || {};

  useEffect(() => {
    if (!sharedId) return;
    fetch(`${API}/snippets/${sharedId}`).then((response) => response.json()).then((data) => {
      if (data.language) { setLanguage(data.language); setCode(data.code); setStdin(data.stdin || ''); setShareLoaded(true); }
    });
  }, [sharedId]);

  const run = async () => {
    setResult({ status: 'running' });
    setTab('Output');
    const response = await fetch(`${API}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, code, stdin }) });
    const job = await response.json();
    if (!response.ok) { setResult({ status: 'failed', stderr: job.error }); return; }
    const poll = setInterval(async () => {
      const currentResult = await (await fetch(`${API}/result/${job.jobId}`)).json();
      if (currentResult.status !== 'queued') { clearInterval(poll); setResult(currentResult); setTab(currentResult.stderr ? 'Errors' : 'Output'); }
    }, 500);
  };

  const save = async () => {
    if (!token) { setAuthOpen(true); return; }
    const response = await fetch(`${API}/snippets`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ language, code, stdin }) });
    const data = await response.json();
    if (response.ok) { await navigator.clipboard?.writeText(`${location.origin}${data.url}`); window.history.replaceState({}, '', data.url); }
  };
  const selectLanguage = (event) => { const next = event.target.value; setLanguage(next); setCode(languages[next].code); setResult(null); setTab('Output'); };
  const status = useMemo(() => result?.status === 'running' ? 'Running…' : result?.status === 'completed' ? `${result.executionTimeMs || 0} ms` : 'Ready', [result]);

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/">Glass<span>Box</span></a>
      <div className="topbar-actions">
        <label className="sr-only" htmlFor="language">Language</label>
        <select id="language" value={language} onChange={selectLanguage}>{Object.entries(languages).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select>
        <button className="button primary run-button" onClick={run} disabled={result?.status === 'running'}><span>▶</span> {result?.status === 'running' ? 'Running' : 'Run'}</button>
        <button className="button secondary" onClick={save}>Save / Share</button>
        {token ? <button className="text-button" onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Log out</button> : <button className="text-button" onClick={() => setAuthOpen(true)}>Log in</button>}
      </div>
    </header>
    {sharedId && <div className="share-banner">{shareLoaded ? 'Shared snippet loaded — edit and run it freely.' : 'Loading shared snippet…'}</div>}
    <main className="workspace">
      <section className="editor-pane panel">
        <div className="panel-heading"><span>Source code</span><span className="status-dot"><i /> {status}</span></div>
        <Editor height="calc(100% - 102px)" language={languages[language].editor} theme="glassbox-dark" value={code} onChange={(value) => setCode(value || '')} onMount={(editor, monaco) => monaco.editor.defineTheme('glassbox-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#10131d', 'editorLineNumber.foreground': '#566079', 'editorLineNumber.activeForeground': '#8b9cff', 'editor.selectionBackground': '#343b70' } })} options={{ fontSize: 14, lineHeight: 23, minimap: { enabled: false }, padding: { top: 16 }, wordWrap: 'on', automaticLayout: true }} />
        <textarea aria-label="Standard input" placeholder="Standard input (optional)" value={stdin} onChange={(event) => setStdin(event.target.value)} />
      </section>
      <section className="output-pane panel">
        <nav className="tabs" aria-label="Result views">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
        <div className="result-content">
          {tab === 'Output' && <pre className="output">{result?.stdout || (result?.status === 'running' ? 'Executing your program…' : 'Run your code to see output here.')}</pre>}
          {tab === 'Errors' && <pre className="output error-text">{result?.stderr || 'No errors to show.'}</pre>}
          {tab === 'Tokens' && (result?.tokens?.length ? <div className="table-wrap"><table><thead><tr><th>Type</th><th>Value</th><th>Line : Col</th></tr></thead><tbody>{result.tokens.map((item, index) => <tr key={index}><td className="token-type">{item.type}</td><td>{item.value || '∅'}</td><td>{item.line} : {item.col}</td></tr>)}</tbody></table></div> : <EmptyState text="Run glassbox-lang to inspect tokens." />)}
          {tab === 'AST' && (result?.ast ? <Tree node={result.ast} /> : <EmptyState text="Run glassbox-lang to build its AST." />)}
          {tab === 'Trace' && <div className="trace-view">{trace.length ? <><div className="trace-controls"><button className="button secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>← Prev</button><span>Step {step + 1} / {trace.length}</span><button className="button secondary" disabled={step === trace.length - 1} onClick={() => setStep(Math.min(trace.length - 1, step + 1))}>Next →</button></div><p className="trace-line">Line {current.line} <strong>{current.node}</strong></p><pre>{JSON.stringify(current.variables, null, 2)}</pre></> : <EmptyState text="Run glassbox-lang to step through execution." />}</div>}
        </div>
      </section>
    </main>
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="auth-card" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button><p className="eyebrow">WELCOME TO GLASSBOX</p><h2>Keep your work close.</h2><p className="muted">Sign in to save snippets and share them with your team.</p><Auth onToken={(value) => { setToken(value); setAuthOpen(false); }} /></div></div>}
  </div>;
}

function EmptyState({ text }) { return <div className="empty-state"><div className="empty-icon">◇</div><p>{text}</p></div>; }

createRoot(document.getElementById('root')).render(<App />);
