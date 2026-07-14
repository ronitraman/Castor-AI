'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Terminal, Code2, Layers, History, Cpu, Copy, Check, Activity, Plus, Fingerprint } from 'lucide-react';

type SystemLog = {
  id: string;
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
};

type ChatSession = {
  id: string;
  title: string;
  messages: {role: string, content: string}[];
};

export default function Chat() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [text, setText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'logs'>('preview');
  
  const [extractedCode, setExtractedCode] = useState<string>('');
  const [codeLanguage, setCodeLanguage] = useState<string>('plaintext');
  const [isCopied, setIsCopied] = useState(false);

  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([
    { id: 'boot-1', timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'System initialized under Castor protocol v0.1.0' }
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addLog = (type: SystemLog['type'], message: string) => {
    setSystemLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    }]);
  };

  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [systemLogs, activeTab]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset first
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Expand to fit
    }
  }, [text]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const content = lastMessage.content;
      
      // HARDENED REGEX: Forces closing backticks to be preceded by a newline
      const match = content.match(/```(\w*)\n([\s\S]*?)(?:\n```|$)/);
      
      if (match && match[2].trim() !== extractedCode) {
        const lang = match[1] || 'code';
        const code = match[2].trim();
        setCodeLanguage(lang);
        setExtractedCode(code);
        setActiveTab('preview');
        
        if (content.includes('\n```') && content.split('\n```').length >= 2) {
           addLog('success', `Artifact extracted: ${lang} script (${code.length} bytes compiled)`);
        }
      }
    }
  }, [messages]);

  const startNewChat = () => {
    if (isExecuting && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (messages.length === 0) return; 
    const title = messages.find(m => m.role === 'user')?.content || 'Untitled Workspace';
    
    setChatHistory(prev => [{ id: Math.random().toString(36).substring(7), title, messages }, ...prev]);
    setMessages([]);
    setExtractedCode('');
    setCodeLanguage('plaintext');
    setActiveTab('preview');
    addLog('info', 'Workspace wiped. New session environment allocated.');
  };

  const loadSession = (sessionId: string) => {
    if (isExecuting && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const sessionToLoad = chatHistory.find(s => s.id === sessionId);
    if (!sessionToLoad) return;

    if (messages.length > 0) {
      const currentTitle = messages.find(m => m.role === 'user')?.content || 'Untitled Workspace';
      setChatHistory(prev => {
        const filteredHistory = prev.filter(s => s.id !== sessionId);
        return [{ id: Math.random().toString(36).substring(7), title: currentTitle, messages }, ...filteredHistory];
      });
    } else {
      setChatHistory(prev => prev.filter(s => s.id !== sessionId));
    }

    setMessages(sessionToLoad.messages);
    
    const lastMsg = sessionToLoad.messages[sessionToLoad.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      const match = lastMsg.content.match(/```(\w*)\n([\s\S]*?)(```|$)/);
      if (match) {
        setCodeLanguage(match[1] || 'code');
        setExtractedCode(match[2].trim());
        setActiveTab('preview');
      } else {
        setExtractedCode('');
      }
    } else {
      setExtractedCode('');
    }

    addLog('info', `Workspace context switched to: ${sessionToLoad.title}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedCode);
    setIsCopied(true);
    addLog('info', 'Artifact copied to system clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isExecuting) return;

    abortControllerRef.current = new AbortController();
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setText('');
    setIsExecuting(true);
    
    addLog('info', 'Opening stream pipeline for incoming instruction...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal 
      });

      if (!response.ok) throw new Error(`HTTP ${response.status} - API Offline`);
      if (!response.body) throw new Error('No readable stream found in payload');

      addLog('success', 'Secure handshake established. Decoding stream...');
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        assistantText += decoder.decode(value, { stream: true });
        
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = assistantText;
          return updated;
        });
      }
      addLog('info', 'Stream closed. Packet transmission complete.');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        addLog('warn', 'Stream explicitly terminated by user override.');
        return; 
      }

      console.error(error);
      setMessages((prev) => {
        const updated = [...prev];
        const errorMsg = '[CRITICAL FAILURE] Pipeline disconnected.';
        if (updated[updated.length - 1].role === 'assistant' && updated[updated.length - 1].content === '') {
          updated[updated.length - 1].content = errorMsg;
        } else if (updated[updated.length - 1].role === 'user') {
          updated.push({ role: 'assistant', content: errorMsg });
        }
        return updated;
      });
      addLog('error', `Network failure intercepted: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderCleanContent = (content: string) => {
    if (!content) return null; 
    
    if (content.includes('```') && !content.includes('\n```') && isExecuting) {
      const parts = content.split(/```\w*\n/);
      return (
        <div className="flex flex-col gap-2">
          <span>{parts[0]}</span>
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[10px] animate-pulse bg-zinc-900 p-2 rounded border border-zinc-800">
            <Loader2 className="w-3 h-3 animate-spin shrink-0"/>
            [Incoming code stream detected... compiling to sandbox]
          </div>
        </div>
      );
    }

    const elements = [];
    // HARDENED REGEX: Applied globally to the render mapping
    const regex = /```(\w*)\n([\s\S]*?)(?:\n```|$)/g;
    let match;
    let lastIndex = 0;
    let keyCount = 0;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(<span key={keyCount++}>{content.slice(lastIndex, match.index)}</span>);
      }
      
      const lang = match[1] || 'code';
      const code = match[2].trim();
      
      elements.push(
        <button 
          key={keyCount++}
          onClick={() => {
            setCodeLanguage(lang);
            setExtractedCode(code);
            setActiveTab('preview');
            addLog('info', `Archived artifact (${lang}) reloaded into active sandbox.`);
          }}
          className="block w-full text-left mt-3 mb-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all cursor-pointer group shadow-inner"
        >
          <span className="flex items-center gap-2 text-zinc-200 text-xs font-mono font-medium">
            <Code2 className="w-4 h-4 text-zinc-400" />
            📁 Artifact Archived: Click to reload {lang} script
          </span>
          <span className="block mt-1 text-[10px] text-zinc-500 font-mono ml-6">
            {code.length} bytes
          </span>
        </button>
      );
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      elements.push(<span key={keyCount++}>{content.slice(lastIndex)}</span>);
    }

    return <div className="whitespace-pre-wrap leading-relaxed">{elements.length > 0 ? elements : content}</div>;
  };
  
  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-200 font-sans antialiased overflow-hidden">
      
      {/* LEFT SIDEBAR - MONOCHROME */}
      <aside className="w-64 border-r border-zinc-900 bg-[#000000] flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo Section: Black, White & Grey only */}
          <div className="p-5 border-b border-zinc-900 flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-zinc-100">CASTOR<span className="text-zinc-500">.AI</span></h1>
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider text-left">v0.1.0-alpha</p>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <div>
              <span className="text-[10px] font-bold text-zinc-600 tracking-wider uppercase font-mono px-2">Core Kernel</span>
              <div className="mt-2 space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium bg-zinc-900/30 text-zinc-400 border border-zinc-850 transition-all cursor-default">
                  <Cpu className="w-3.5 h-3.5" />
                  Gemini 3.5 Flash
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-zinc-600 tracking-wider uppercase font-mono">Workspace History</span>
                <button 
                  onClick={startNewChat}
                  title="New Workspace" 
                  className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto pr-2">
                {messages.length > 0 && (
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-zinc-200 bg-zinc-900 border border-zinc-800 transition-all text-left">
                    <span className="flex items-center gap-2.5 truncate">
                      <Activity className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                      <span className="truncate">{messages.find(m => m.role === 'user')?.content || 'Current Session'}</span>
                    </span>
                  </button>
                )}

                {chatHistory.map((session) => (
                  <button 
                    key={session.id} 
                    onClick={() => loadSession(session.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-all text-left group"
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <History className="w-3.5 h-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      <span className="truncate">{session.title}</span>
                    </span>
                  </button>
                ))}

                {messages.length === 0 && chatHistory.length === 0 && (
                  <div className="px-3 py-3 text-[11px] text-zinc-600 font-mono text-center border border-dashed border-zinc-900 rounded-md bg-zinc-950/40">
                    No active sessions.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-900">
          <div className="flex items-center gap-2 px-2 py-1 bg-zinc-950 border border-zinc-900 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-500">Engine Online</span>
          </div>
        </div>
      </aside>

      {/* MIDDLE PANEL: CONSOLE STREAM */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 md:w-1/2 flex flex-col border-r border-zinc-900 bg-[#09090b] h-full justify-between">
          <header className="p-4 border-b border-zinc-900 flex items-center justify-between bg-[#000000]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-400">Execution Console</span>
            </div>
            <button onClick={startNewChat} className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-900 rounded-md">
              <Plus className="w-4 h-4" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="h-10 w-10 rounded-md bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-600 mb-3">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-500">Awaiting Pipeline Activation</h3>
                <p className="text-[11px] text-zinc-600 font-mono mt-1 max-w-xs">Send instructions or architectural traces to triage.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg p-4 shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 font-normal text-xs font-mono border border-zinc-700' 
                    : 'bg-[#000000] border border-zinc-900 text-zinc-300 text-xs font-mono leading-relaxed whitespace-pre-wrap'
                }`}>
                  {m.role !== 'user' && <div className="text-[9px] font-mono text-zinc-500 uppercase mb-1.5 tracking-wider border-b border-zinc-900 pb-1">⚡ CASTOR SYSTEM CORE</div>}
                  {m.role === 'user' ? m.content : renderCleanContent(m.content)}
                </div>
              </div>
            ))}
            
            {isExecuting && (
              <div className="flex justify-start">
                <div className="bg-[#000000] border border-zinc-900 rounded-lg p-4 flex items-center gap-2.5 text-zinc-500 text-xs font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600" />
                  Decoding incoming packet...
                </div>
              </div>
            )}
          </main>

          <footer className="p-4 border-t border-zinc-900 bg-[#000000]">
            <form onSubmit={onSubmit} className="relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                className="w-full bg-[#09090b] border border-zinc-800 text-zinc-100 rounded-lg pl-4 pr-12 py-3.5 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-all shadow-inner resize-none max-h-48 overflow-y-auto min-h-[44px]"
                value={text}
                placeholder="root@castor_engine:~#"
                disabled={isExecuting}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (text.trim() && !isExecuting) {
                      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                      onSubmit(fakeEvent);
                    }
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={isExecuting || !text.trim()} 
                className="absolute right-2.5 bottom-2.5 p-2 bg-zinc-200 hover:bg-zinc-100 disabled:opacity-10 text-zinc-900 rounded transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </footer>
        </div>

        {/* RIGHT PANEL: WORKSPACE SANDBOX */}
        <div className="flex-1 md:w-1/2 bg-[#000000] flex flex-col h-full hidden md:flex">
          <header className="px-4 py-3 border-b border-zinc-900 flex items-center justify-between bg-[#000000]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-mono font-medium text-zinc-400">Workspace Sandbox</span>
            </div>
            
            <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-900">
              <button 
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all ${activeTab === 'preview' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Code2 className="w-3 h-3" />
                Live Workspace
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-mono transition-all ${activeTab === 'logs' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Activity className="w-3 h-3" />
                Telemetry
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#050507] p-4">
            {activeTab === 'preview' ? (
              extractedCode ? (
                <div className="w-full h-full bg-[#000000] rounded-lg border border-zinc-900 flex flex-col overflow-hidden shadow-2xl">
                  <div className="px-4 py-2 bg-[#09090b] border-b border-zinc-900 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Artifact: current.{codeLanguage === 'python' ? 'py' : 'txt'}</span>
                    <button 
                      onClick={copyToClipboard}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-[10px] text-zinc-400 transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-zinc-300" /> : <Copy className="w-3 h-3" />}
                      {isCopied ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="flex-1 p-4 font-mono text-xs text-zinc-300 overflow-auto whitespace-pre leading-relaxed select-text text-left bg-[#000000]">
                    <code>{extractedCode}</code>
                  </pre>
                </div>
              ) : (
                <div className="m-auto text-center p-6 border border-dashed border-zinc-900 bg-[#000000] rounded-lg max-w-sm">
                  <div className="h-10 w-10 rounded bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-600 mx-auto mb-3">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-zinc-500">Sandbox Pipeline Empty</h3>
                  <p className="text-[11px] text-zinc-600 leading-relaxed mt-1.5">
                    Castor is parsing text. Code scripts will manifest cleanly here upon compilation request.
                  </p>
                </div>
              )
            ) : (
              <div className="w-full h-full font-mono text-[11px] overflow-y-auto p-4 bg-[#000000] rounded-lg border border-zinc-900 text-left space-y-1.5 select-text">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 leading-relaxed">
                    <span className="text-zinc-700 shrink-0 select-none">[{log.timestamp}]</span>
                    <span className="text-zinc-400">
                      <span className="uppercase text-[9px] mr-2 tracking-widest text-zinc-600">[{log.type}]</span>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}