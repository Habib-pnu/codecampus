import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ - Computer Engineering PNU CodeCampus',
  description: 'เข้าสู่ระบบบัญชี Computer Engineering PNU CodeCampus ของคุณ',
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
