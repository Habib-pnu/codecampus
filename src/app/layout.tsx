
import type { Metadata } from 'next';
import './globals.css';
import Script from 'next/script';
import { LanguageProvider } from '@/context/language-context';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});


export const metadata: Metadata = {
  title: 'Computer Engineering PNU CodeCampus - C++ Learning Platform',
  description: 'เรียนรู้ C++ และการคอมไพล์ G++ ออนไลน์กับ Computer Engineering PNU CodeCampus',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head></head>
      <body>
        <LanguageProvider>
          <div id="fb-root"></div>
          <Script id="fb-sdk-script" strategy="lazyOnload">
            {`
              window.fbAsyncInit = function() {
                FB.init({
                  xfbml            : true,
                  version          : 'v19.0'
                });
              };

              (function(d, s, id){
                 var js, fjs = d.getElementsByTagName(s)[0];
                 if (d.getElementById(id)) {return;}
                 js = d.createElement(s); js.id = id;
                 js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
                 fjs.parentNode.insertBefore(js, fjs);
               }(document, 'script', 'facebook-jssdk'));
            `}
          </Script>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
