import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';
import './style.css';

const API = import.meta.env.VITE_API_URL || '/api';
const languages = {
  python: { label: 'Python', emoji: '🐍', color: '#C1FF83', editor: 'python', code: 'print("Hello, GlassBox!")' },
  c: { label: 'C', emoji: '⚙️', color: '#90BDFF', editor: 'c', code: '#include <stdio.h>\nint main(){ puts("Hello, GlassBox!"); }' },
  cpp: { label: 'C++', emoji: '➕', color: '#75E5EA', editor: 'cpp', code: '#include <iostream>\nint main() { std::cout << "Hello, GlassBox!" << std::endl; }' },
  java: { label: 'Java', emoji: '☕', color: '#FF9A9A', editor: 'java', code: 'class Main { public static void main(String[] a){System.out.println("Hello, GlassBox!");}}' },
  node: { label: 'Node.js', emoji: '🟩', color: '#96FFCA', editor: 'javascript', code: 'console.log("Hello, GlassBox!")' },
  'glassbox-lang': { label: 'glassbox-lang', emoji: '🔍', color: '#FFEA79', editor: 'plaintext', code: 'int n = 5;\nfunc fact(int x): int {\n  if (x <= 1) { return 1; }\n  return x * fact(x - 1);\n}\nprint(fact(n));' }
};

const tabInfo = {
  Output: { emoji: '📤', color: '#C1FF83', tip: 'Everything your program prints lands here. Try changing a value and running again!' },
  Errors: { emoji: '🐛', color: '#FF9A9A', tip: 'Errors are clues, not failures. Read the line number, then go hunting.' },
  Tokens: { emoji: '🧩', color: '#90BDFF', tip: 'Step 1 of compiling: the lexer chops your source into tokens — the “words” of the language.' },
  AST: { emoji: '🌳', color: '#96FFCA', tip: 'Step 2: the parser arranges tokens into an Abstract Syntax Tree. Click nodes to fold and unfold them.' },
  Trace: { emoji: '🎬', color: '#FFEA79', tip: 'Step 3: the interpreter walks the tree. Step through it and watch variables change.' }
};

const XP_PER_RUN = 10;
const readXp = () => { try { return Number(localStorage.glassboxXp) || 0; } catch { return 0; } };
const writeXp = (value) => { try { localStorage.glassboxXp = String(value); } catch { /* storage unavailable */ } };

function Tree({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  if (!node) return null;
  const children = node.children || [];
  return <div className="tree-node" style={{ '--depth': depth }}>
    <button className="tree-label" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="tree-caret">{children.length ? (open ? '−' : '+') : '•'}</span>
      <span className="tree-type">{node.type}</span>{node.name && <span className="tree-name"> {node.name}</span>}
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
  const [xp, setXp] = useState(readXp);
  const [toast, setToast] = useState(null);
  const [edited, setEdited] = useState(false);
  const [peeked, setPeeked] = useState(false);
  const visualTabs = language === 'glassbox-lang' ? ['Tokens', 'AST', 'Trace'] : [];
  const tabs = ['Output', 'Errors', ...visualTabs];
  const trace = result?.trace || [];
  const current = trace[step] || {};
  const level = Math.floor(xp / 50) + 1;
  const levelProgress = (xp % 50) * 2;

  useEffect(() => {
    if (!sharedId) return;
    fetch(`${API}/snippets/${sharedId}`).then((response) => response.json()).then((data) => {
      if (data.language) { setLanguage(data.language); setCode(data.code); setStdin(data.stdin || ''); setShareLoaded(true); }
    });
  }, [sharedId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const celebrate = (finished) => {
    if (finished.stderr) { setToast({ kind: 'oops', text: 'Bug spotted! 🐛 Check the Errors tab.' }); return; }
    const next = xp + XP_PER_RUN;
    setXp(next); writeXp(next);
    setToast({ kind: 'yay', text: Math.floor(next / 50) > Math.floor(xp / 50) ? `Level up! You're now level ${Math.floor(next / 50) + 1} 🚀` : `+${XP_PER_RUN} XP — nice run! 🎉` });
  };

  const run = async () => {
    setResult({ status: 'running' });
    setTab('Output');
    setStep(0);
    const response = await fetch(`${API}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, code, stdin }) });
    const job = await response.json();
    if (!response.ok) { setResult({ status: 'failed', stderr: job.error }); setToast({ kind: 'oops', text: job.error || 'Could not run that one.' }); return; }
    const poll = setInterval(async () => {
      const currentResult = await (await fetch(`${API}/result/${job.jobId}`)).json();
      if (currentResult.status !== 'queued') { clearInterval(poll); setResult(currentResult); setTab(currentResult.stderr ? 'Errors' : 'Output'); celebrate(currentResult); }
    }, 500);
  };

  const save = async () => {
    if (!token) { setAuthOpen(true); return; }
    const response = await fetch(`${API}/snippets`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ language, code, stdin }) });
    const data = await response.json();
    if (response.ok) { await navigator.clipboard?.writeText(`${location.origin}${data.url}`); window.history.replaceState({}, '', data.url); setToast({ kind: 'yay', text: 'Share link copied to clipboard 📋' }); }
  };
  const selectLanguage = (next) => { setLanguage(next); setCode(languages[next].code); setResult(null); setTab('Output'); setEdited(false); };
  const openTab = (item) => { setTab(item); if (visualTabs.includes(item)) setPeeked(true); };
  const status = useMemo(() => result?.status === 'running' ? 'Running…' : result?.status === 'completed' ? `${result.executionTimeMs || 0} ms` : 'Ready', [result]);
  const quest = [
    { label: 'Write', emoji: '✏️', done: edited },
    { label: 'Run', emoji: '🚀', done: !!result && result.status !== 'running' },
    { label: 'Peek inside', emoji: '🔍', done: peeked }
  ];

  return <div className="app-shell">
    <div className="stickers" aria-hidden="true">
      <span className="sticker s1">{'{ }'}</span><span className="sticker s2">★</span><span className="sticker s3">01</span><span className="sticker s4">λ</span>
    </div>
    <header className="topbar">
      <a className="brand" href="/"><span className="brand-logo">◆</span>Glass<span className="brand-hl">Box</span></a>
      <div className="xp" title={`${xp} XP total`}>
        <span className="xp-level">Lv {level}</span>
        <span className="xp-bar"><i style={{ width: `${levelProgress}%` }} /></span>
        <span className="xp-points">{xp} XP</span>
      </div>
      <div className="topbar-actions">
        <button className="button primary run-button" onClick={run} disabled={result?.status === 'running'}><span>▶</span> {result?.status === 'running' ? 'Running' : 'Run'}</button>
        <button className="button secondary" onClick={save}>Save / Share</button>
        {token ? <button className="text-button" onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Log out</button> : <button className="text-button" onClick={() => setAuthOpen(true)}>Log in</button>}
      </div>
    </header>
    {sharedId && <div className="share-banner">{shareLoaded ? '✨ Shared snippet loaded — edit and run it freely.' : 'Loading shared snippet…'}</div>}
    <section className="hero">
      <div className="hero-copy">
        <h1>See how your code <span className="squiggle">really</span> runs.</h1>
        <p>Pick a language, hit Run, then peek inside the compiler. Every run earns XP!</p>
      </div>
      <ol className="quest" aria-label="Learning quest">
        {quest.map((item, index) => <li key={item.label} className={item.done ? 'done' : ''}><span className="quest-dot">{item.done ? '✓' : index + 1}</span><span>{item.emoji} {item.label}</span></li>)}
      </ol>
    </section>
    <nav className="lang-chips" aria-label="Language">
      {Object.entries(languages).map(([key, item]) => <button key={key} className={`chip ${language === key ? 'active' : ''}`} style={{ '--chip': item.color }} aria-pressed={language === key} onClick={() => selectLanguage(key)}><span aria-hidden="true">{item.emoji}</span> {item.label}</button>)}
    </nav>
    <main className="workspace">
      <section className="editor-pane panel">
        <div className="panel-heading"><span className="panel-title">✏️ Source code</span><span className={`status-dot ${result?.status === 'running' ? 'busy' : ''}`}><i /> {status}</span></div>
        <div className="editor-wrap">
          <Editor height="100%" language={languages[language].editor} theme="glassbox-light" value={code} onChange={(value) => { setCode(value || ''); setEdited(true); }} beforeMount={(monaco) => monaco.editor.defineTheme('glassbox-light', { base: 'vs', inherit: true, rules: [], colors: { 'editor.background': '#FFFFFF', 'editorLineNumber.foreground': '#9AB8BA', 'editorLineNumber.activeForeground': '#000000', 'editor.selectionBackground': '#FFEA79', 'editor.lineHighlightBackground': '#F2FAFA' } })} options={{ fontSize: 14, lineHeight: 23, minimap: { enabled: false }, padding: { top: 16 }, wordWrap: 'on', automaticLayout: true }} />
        </div>
        <textarea aria-label="Standard input" placeholder="⌨️ Standard input (optional)" value={stdin} onChange={(event) => setStdin(event.target.value)} />
      </section>
      <section className="output-pane panel">
        <nav className="tabs" aria-label="Result views">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} style={{ '--tab': tabInfo[item].color }} onClick={() => openTab(item)}><span aria-hidden="true">{tabInfo[item].emoji}</span> {item}</button>)}</nav>
        <p className="tip"><span className="tip-label">Did you know?</span> {tabInfo[tab].tip}</p>
        <div className="result-content">
          {tab === 'Output' && <pre className={`output ${result?.status === 'running' ? 'pulsing' : ''}`}>{result?.stdout || (result?.status === 'running' ? 'Executing your program…' : 'Run your code to see output here.')}</pre>}
          {tab === 'Errors' && <pre className="output error-text">{result?.stderr || 'No errors to show. 🎉'}</pre>}
          {tab === 'Tokens' && (result?.tokens?.length ? <div className="table-wrap"><table><thead><tr><th>Type</th><th>Value</th><th>Line : Col</th></tr></thead><tbody>{result.tokens.map((item, index) => <tr key={index} style={{ '--i': index }}><td><span className="token-type">{item.type}</span></td><td>{item.value || '∅'}</td><td>{item.line} : {item.col}</td></tr>)}</tbody></table></div> : <EmptyState emoji="🧩" text="Run glassbox-lang to inspect tokens." />)}
          {tab === 'AST' && (result?.ast ? <div className="tree"><Tree node={result.ast} /></div> : <EmptyState emoji="🌳" text="Run glassbox-lang to build its AST." />)}
          {tab === 'Trace' && <div className="trace-view">{trace.length ? <>
            <div className="trace-controls"><button className="button secondary" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>← Prev</button><span>Step {step + 1} / {trace.length}</span><button className="button secondary" disabled={step === trace.length - 1} onClick={() => setStep(Math.min(trace.length - 1, step + 1))}>Next →</button></div>
            <input className="trace-slider" type="range" min="0" max={trace.length - 1} value={step} onChange={(event) => setStep(Number(event.target.value))} aria-label="Trace step" />
            <p className="trace-line" key={step}>Line {current.line} <strong>{current.node}</strong></p>
            <Variables value={current.variables} />
          </> : <EmptyState emoji="🎬" text="Run glassbox-lang to step through execution." />}</div>}
        </div>
      </section>
    </main>
    {toast && <div className={`toast ${toast.kind}`} role="status">{toast.text}</div>}
    {authOpen && <div className="modal-backdrop" onClick={() => setAuthOpen(false)}><div className="auth-card" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button><p className="eyebrow">WELCOME TO GLASSBOX</p><h2>Keep your work close.</h2><p className="muted">Sign in to save snippets and share them with your team.</p><Auth onToken={(value) => { setToken(value); setAuthOpen(false); }} /></div></div>}
  </div>;
}

function Variables({ value }) {
  const entries = value && typeof value === 'object' ? Object.entries(value) : [];
  if (!entries.length) return <p className="muted vars-empty">No variables in scope yet.</p>;
  return <div className="vars">{entries.map(([name, item]) => <div className="var-card" key={name}><span className="var-name">{name}</span><span className="var-value">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</span></div>)}</div>;
}

function EmptyState({ emoji, text }) { return <div className="empty-state"><div className="empty-icon">{emoji}</div><p>{text}</p></div>; }

createRoot(document.getElementById('root')).render(<App />);
