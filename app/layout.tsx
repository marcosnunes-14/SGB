import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SGB | Sistema de Gestão Bibliotecária",
  description: "Gestão de acervo, prateleiras e empréstimos para bibliotecas.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
