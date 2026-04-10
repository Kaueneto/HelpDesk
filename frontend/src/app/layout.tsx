import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import 'react-datepicker/dist/react-datepicker.css';
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "HelpDesk - Sistema de Chamados",
  description: "Sistema de gerenciamento de chamados técnicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={poppins.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedMode = localStorage.getItem('theme-mode');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = storedMode === 'dark' || (!storedMode && prefersDark);
                
                const html = document.documentElement;
                const body = document.body;
                
                if (isDark) {
                  html.classList.add('dark');
                  html.style.backgroundColor = '#0F172A';
                  html.style.color = '#F1F5F9';
                  body.style.backgroundColor = '#0F172A';
                  body.style.color = '#F1F5F9';
                } else {
                  html.classList.remove('dark');
                  html.style.backgroundColor = '#FFFFFF';
                  html.style.color = '#1F2937';
                  body.style.backgroundColor = '#FFFFFF';
                  body.style.color = '#1F2937';
                }
              } catch (e) {
                // Fallback: theme claro por padrão
                document.documentElement.style.backgroundColor = '#FFFFFF';
                document.documentElement.style.color = '#1F2937';
                document.body.style.backgroundColor = '#FFFFFF';
                document.body.style.color = '#1F2937';
              }
            `,
          }}
          suppressHydrationWarning
        />
      </head>
      <body 
        className="antialiased" 
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: 0,
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
