import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ลงทะเบียน - Computer Engineering PNU CodeCampus',
  description: 'สร้างบัญชีใหม่สำหรับ Computer Engineering PNU CodeCampus',
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
