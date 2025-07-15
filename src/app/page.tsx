'use client'; // Required for redirect in App Router's page.tsx

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p style={{ color: 'black' }}>wait...</p>
    </div>
  );
}
