'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Role = 'user' | 'assistant';
type Message = { id: string; role: Role; text: string };

const API_STATUS = '/api/assist/status';
const API_QUERY  = '/api/assist/query';

// Safe UUID (fallback if crypto.randomUUID is unavailable)
function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Build a compact transcript so the backend has context without flooding it
function buildTranscriptPrompt(messages: Message[], latestUser: string, maxPairs = 6) {
  const pairs: string[] = [];
  for (let i = messages.length - 1; i >= 0 && pairs.length < maxPairs; i--) {
    const m = messages[i];
    if (m.role === 'assistant') {
      const prev = messages[i - 1];
      if (prev?.role === 'user') {
        pairs.unshift(`User: ${prev.text}\nAssistant: ${m.text}`);
        i -= 1;
      }
    }
  }
  const history = pairs.join('\n\n');
  return (history ? history + '\n\n' : '') + `User: ${latestUser}\nAssistant:`;
}

export const MDJAssistChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: 'assistant',
      text:
        'Hi! I can help with clients, deadlines, tasks, and insights.\n' +
        'Try: “Summarise client 1A001”, “What filings are due this month?”, or “Priority tasks today”.',
    },
  ]);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Smooth scroll to bottom on message changes
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  // Ping backend status once when opened
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(API_STATUS, { cache: 'no-store' });
        if (!alive) return;
        setBackendOnline(r.ok);
      } catch {
        if (!alive) return;
        setBackendOnline(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSend) return;

    const text = input.trim();
    setInput('');
    setError(null);

    const userMsg: Message = { id: uid(), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      // Build compact transcript
      const prompt = buildTranscriptPrompt(messages, text);

      // Attach lightweight implicit context (e.g., clientRef from URL)
      const context: Record<string, any> = {};
      try {
        const m = window.location.pathname.match(/\/clients\/([^/]+)/);
        if (m?.[1]) context.clientRef = m[1];
      } catch {
        /* noop */
      }

      const res = await fetch(API_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Nest AssistController expects: { prompt: string, context?: AssistContext }
        body: JSON.stringify({ prompt, context }),
      });

      if (!res.ok) {
        let message = `Assistant request failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.message) message = Array.isArray(j.message) ? j.message.join(', ') : j.message;
        } catch {
          /* ignore parse errors */
        }
        throw new Error(message);
      }

      const data = await res.json();
      const replyText: string =
        data?.response ||
        data?.message ||
        'I’m sorry — I could not generate a response at this time.';

      setMessages(prev => [...prev, { id: uid(), role: 'assistant', text: replyText }]);
      setBackendOnline(true);
    } catch (err: any) {
      console.error(err);
      setBackendOnline(false);
      setError(
        err?.message ??
          'Could not reach the MDJ Assist backend. Check that the API server is running and the Next.js rewrite is correct.',
      );
      setMessages(prev => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          text:
            'I could not contact the backend right now.\n' +
            'Please verify your API is reachable at /api/assist/query (proxied to http://localhost:3001/api/v1/assist/query).',
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Status / connectivity banner */}
      {backendOnline === false && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 193, 7, 0.15)',
            color: '#ffd166',
            borderBottom: '1px solid rgba(255, 193, 7, 0.25)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          MDJ Assist can’t reach the backend. Check your API server/rewrite.
        </div>
      )}

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'transparent',
        }}
      >
        {messages.map(m => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '10px 12px',
              borderRadius: 12,
              lineHeight: 1.45,
              color: m.role === 'user' ? '#111' : '#f5f5f5',
              background:
                m.role === 'user'
                  ? 'linear-gradient(135deg, #c8a652, #b9973e)'
                  : 'rgba(255,255,255,0.08)',
              border:
                m.role === 'user'
                  ? '1px solid rgba(0,0,0,0.15)'
                  : '1px solid rgba(212,175,55,0.25)',
              boxShadow:
                m.role === 'user'
                  ? '0 2px 10px rgba(0,0,0,0.25)'
                  : '0 1px 8px rgba(0,0,0,0.25)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Non-blocking error banner (for extra context) */}
      {error && (
        <div
          style={{
            padding: '8px 12px',
            color: '#ffb3b3',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.25)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={send}
        style={{
          borderTop: '1px solid rgba(212,175,55,0.25)',
          padding: 10,
          display: 'flex',
          gap: 8,
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask MDJ Assist… (Shift+Enter for newline)"
          style={{
            flex: 1,
            height: 44,
            borderRadius: 10,
            border: '1px solid rgba(212,175,55,0.25)',
            padding: '0 12px',
            outline: 'none',
            color: '#f9f9f9',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          style={{
            height: 44,
            padding: '0 16px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.1)',
            background: canSend
              ? 'linear-gradient(135deg, #c8a652, #b9973e)'
              : 'linear-gradient(135deg, #c8a65280, #b9973e80)',
            color: '#111',
            fontWeight: 700,
            cursor: canSend ? 'pointer' : 'not-allowed',
            minWidth: 96,
          }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
};