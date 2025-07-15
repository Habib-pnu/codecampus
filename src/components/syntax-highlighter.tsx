"use client";

import React from 'react';

const KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit',
  'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case',
  'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl',
  'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast',
  'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default',
  'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit',
  'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if',
  'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not',
  'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected',
  'public', 'reflexpr', 'register', 'reinterpret_cast', 'requires', 'return',
  'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast',
  'struct', 'switch', 'synchronized', 'template', 'this', 'thread_local',
  'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union',
  'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while',
  'xor', 'xor_eq'
]);

const PREPROCESSOR = new Set([
  '#include', '#define', '#ifdef', '#ifndef', '#endif', '#if', '#else', '#elif', '#pragma'
]);

const TYPES = new Set([
    'std', 'string', 'vector', 'cout', 'cin', 'endl', 'map', 'set', 'unordered_map', 'iostream'
]);

const parseCode = (code: string) => {
  return code.split(/([ \t\n<>(){};,.:"&|!=*+/~%^-])/g).map((part, index) => {
    const key = `${index}-${part}`;
    if (KEYWORDS.has(part)) {
      return <span key={key} className="text-primary">{part}</span>;
    }
    if (PREPROCESSOR.has(part)) {
        return <span key={key} className="text-accent">{part}</span>;
    }
    if (TYPES.has(part.replace(/[<>]/g, ''))) {
      return <span key={key} className="text-[hsl(var(--chart-2))]">{part}</span>;
    }
    if (!isNaN(Number(part)) && part.trim() !== '') {
      return <span key={key} className="text-[hsl(var(--chart-3))]">{part}</span>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

export const SyntaxHighlighter = ({ code }: { code: string }) => {
  if (!code) {
    return null;
  }
  
  const highlighted = parseCode(code);

  return (
    <pre className="font-code text-sm bg-muted p-4 rounded-lg overflow-x-auto w-full">
      <code className="whitespace-pre-wrap">
        {highlighted}
      </code>
    </pre>
  );
};
