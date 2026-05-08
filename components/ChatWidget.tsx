"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatSettings } from "@/lib/site-settings";

type Role = "bot" | "user";
interface Message {
  id: number;
  role: Role;
  text: string;
}

const STOPWORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux", "et", "ou",
  "à", "a", "en", "que", "qui", "quoi", "où", "ou", "comment", "pour", "par",
  "avec", "sans", "dans", "sur", "sous", "est", "sont", "ce", "cet", "cette",
  "ces", "vous", "nous", "je", "tu", "il", "elle", "on", "ils", "elles",
  "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "votre", "vos",
  "notre", "nos", "leur", "leurs", "y", "ne", "pas", "plus", "si", "alors",
  "the", "and", "or", "of", "to", "in", "on", "for", "with", "is", "are",
  "do", "does", "did", "what", "how", "when", "where", "why", "who", "your",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    // strip diacritics so "delai" matches "délai"
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Match the user message against the standard questions; -1 if no decent match. */
function matchQuestion(userText: string, qa: ChatSettings["qa"]): number {
  const userTokens = tokenize(userText);
  if (userTokens.length === 0) return -1;
  const userSet = new Set(userTokens);
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < qa.length; i += 1) {
    const qTokens = tokenize(qa[i].question);
    if (qTokens.length === 0) continue;
    let overlap = 0;
    for (const t of qTokens) if (userSet.has(t)) overlap += 1;
    // Normalise by the question length so short questions don't dominate.
    const score = overlap / qTokens.length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  // Require at least ~one third of the question keywords to match.
  return bestScore >= 0.34 ? bestIdx : -1;
}

export function ChatWidget({ settings }: { settings: ChatSettings }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const nextIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Seed the welcome message the first time the panel is opened.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        { id: nextIdRef.current++, role: "bot", text: settings.welcomeMessage },
      ]);
    }
  }, [open, messages.length, settings.welcomeMessage]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const quickQuestions = useMemo(
    () => settings.qa.filter((p) => p.question.trim().length > 0),
    [settings.qa]
  );

  function pushBot(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: nextIdRef.current++, role: "bot", text },
    ]);
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: nextIdRef.current++, role: "user", text: trimmed },
    ]);
    // Reply after a short delay so it feels conversational.
    window.setTimeout(() => {
      if (settings.botMode) {
        const idx = matchQuestion(trimmed, settings.qa);
        if (idx >= 0) {
          pushBot(settings.qa[idx].answer);
        } else {
          pushBot(
            "Désolé, je n'ai pas compris votre question. Essayez l'une des questions ci-dessous, ou contactez-nous via la page Contact."
          );
        }
      } else {
        pushBot("Merci pour votre message. Notre équipe vous répondra dès que possible.");
      }
    }, 350);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
    setInput("");
  }

  function askQuick(question: string) {
    sendMessage(question);
  }

  return (
    <div
      className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6 flex flex-col items-end"
      aria-live="polite"
    >
      {open && (
        <div
          className="mb-3 w-[90vw] max-w-sm h-[28rem] max-h-[80vh] bg-white border border-kraft-200 rounded-lg shadow-xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="Chat en direct"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-kraft-700 text-white">
            <div className="font-medium text-sm">Discutons</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le chat"
              className="p-1 rounded hover:bg-kraft-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-kraft-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-kraft-700 text-white rounded-lg rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    : "mr-auto max-w-[85%] bg-white border border-kraft-200 text-kraft-900 rounded-lg rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap break-words"
                }
              >
                {m.text}
              </div>
            ))}

            {settings.botMode && quickQuestions.length > 0 && (
              <div className="pt-2">
                <div className="text-xs text-kraft-600 mb-1">
                  Questions fréquentes :
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => askQuick(p.question)}
                      className="text-xs bg-white border border-kraft-300 hover:bg-kraft-100 text-kraft-800 rounded-full px-3 py-1"
                    >
                      {p.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-kraft-200 p-2 flex gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrivez votre message…"
              maxLength={500}
              className="input flex-1 text-sm"
              aria-label="Votre message"
            />
            <button
              type="submit"
              className="btn-primary text-sm px-3"
              disabled={input.trim().length === 0}
            >
              Envoyer
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
        aria-expanded={open}
        className="bg-kraft-700 hover:bg-kraft-800 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
