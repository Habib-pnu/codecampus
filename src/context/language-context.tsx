
'use client';

import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { translations } from '@/lib/translations';

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'codecampus_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (storedLang && (storedLang === 'en' || storedLang === 'th')) {
      setLanguageState(storedLang);
    } else {
      setLanguageState('th'); // Default to Thai
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = useCallback((key: string, params?: { [key: string]: string | number }) => {
    if (!key) {
      return ''; // Return an empty string if the key is null or undefined
    }
    const keyParts = key.split('.');
    let translationNode: any = translations;

    for (const part of keyParts) {
        if (translationNode && typeof translationNode === 'object' && part in translationNode) {
            translationNode = translationNode[part];
        } else {
            return key;
        }
    }
    
    let text = translationNode[language] || translationNode['en'] || key;

    if (params) {
        Object.keys(params).forEach(paramKey => {
            const regex = new RegExp(`{${paramKey}}`, 'g');
            text = text.replace(regex, String(params[paramKey]));
        });
    }

    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
