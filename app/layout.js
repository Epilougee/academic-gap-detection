import { Inter } from 'next/font/google';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Academic Gap Detection System',
  description: 'Identify topic-level learning gaps, prerequisite root causes, and prioritized study plans.',
};

// Root layout loading Inter font and global styles
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

