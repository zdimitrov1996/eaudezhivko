import "./globals.css";

// The real root layout (with <html>) is app/[locale]/layout.tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
