'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function Chat() {
  // maxSteps is strictly a backend property now, so we remove it here
  const { messages, sendMessage, status } = useChat();
  
  const [inputState, setInputState] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputState.trim()) return;
    sendMessage({ text: inputState });
    setInputState('');
  };

  const handleTestClick = (text: string) => {
    sendMessage({ text });
  };

  const isExecuting = status !== 'ready';

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans select-none">
      
      <header className="p-5 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold tracking-widest text-zinc-100">
            OMNIRESOLVE<span className="text-sky-500">.AI</span>
          </h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">L3 Autonomous Resolution Agent</p>
        </div>
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></div>
          <span className="text-[10px] tracking-widest uppercase font-bold">System Online</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
            <p className="text-sm">Initiate a mock customer support query.</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleTestClick("Where is order DELAY-992?")} 
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                Test: Delayed Order
              </button>
              <button 
                onClick={() => handleTestClick("Where is order 12345?")} 
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                Test: Normal Order
              </button>
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 ${m.role === 'user' ? 'bg-sky-600 text-white' : 'bg-zinc-900 border border-zinc-800'}`}>
              
              {m.parts?.map((part, index) => {
                
                if (part.type === 'text') {
                  return <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>;
                }

                if (part.type === 'tool-invocation') {
                  if (part.state !== 'output-available') {
                    return (
                      <div key={index} className="mt-4 flex items-center gap-3 text-sky-400 text-xs font-mono bg-sky-950/20 p-3 rounded-lg border border-sky-900/30">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        EXECUTING BACKEND ACTION: checkOrderStatus
                      </div>
                    );
                  }

                  const output: any = part.output;
                  const input: any = part.input;
                  const isDelayed = output.status === 'Exception';
                  
                  return (
                    <div key={index} className="mt-5 p-5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                        <h3 className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Live Logistics Telemetry</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isDelayed ? 'bg-red-950/50 text-red-500 border border-red-900/50' : 'bg-emerald-950/50 text-emerald-500 border border-emerald-900/50'}`}>
                          {output.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm font-mono">
                        <p className="flex justify-between"><span className="text-zinc-600">Order ID:</span> <span className="text-zinc-300">{input.orderId}</span></p>
                        <p className="flex justify-between"><span className="text-zinc-600">Location:</span> <span className="text-zinc-300">{output.location}</span></p>
                        <p className="flex justify-between"><span className="text-zinc-600">ETA:</span> <span className="text-zinc-300">{output.estDelivery}</span></p>
                        {isDelayed && (
                          <div className="mt-3 p-3 bg-red-950/20 border border-red-900/30 rounded text-red-400 text-xs">
                            <span className="font-bold">CRITICAL EXCEPTION:</span> {output.delayReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (part.type === 'tool-initiateRefund') {
                  if (part.state !== 'output-available') {
                    return (
                      <div key={index} className="mt-4 flex items-center gap-3 text-sky-400 text-xs font-mono bg-sky-950/20 p-3 rounded-lg border border-sky-900/30">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        EXECUTING BACKEND ACTION: initiateRefund
                      </div>
                    );
                  }

                  const output: any = part.output;

                  return (
                    <div key={index} className="mt-5 p-5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl shadow-2xl relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                       <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Financial Action Executed</h3>
                       <div className="space-y-1 font-mono text-sm">
                         <p className="flex justify-between"><span className="text-zinc-500">Refunded:</span> <span className="text-white">${output.refundAmount} {output.currency}</span></p>
                         <p className="flex justify-between"><span className="text-zinc-500">Destination:</span> <span className="text-zinc-300">Original Payment Method</span></p>
                         <p className="flex justify-between"><span className="text-zinc-500">Txn ID:</span> <span className="text-zinc-400">{output.receiptId}</span></p>
                       </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))}
      </main>

      <footer className="p-6 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <form onSubmit={onSubmit} className="max-w-4xl mx-auto relative flex items-center">
          <input
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
            value={inputState}
            placeholder="User Input Stream..."
            onChange={(e) => setInputState(e.target.value)}
            disabled={isExecuting}
          />
          <button 
            type="submit" 
            disabled={isExecuting || !inputState.trim()}
            className="absolute right-3 p-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg disabled:opacity-30 disabled:hover:bg-sky-600 transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}