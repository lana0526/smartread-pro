'use client';

// 这个组件确保子组件在客户端渲染
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
