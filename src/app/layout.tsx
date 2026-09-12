import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { getUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meal Fresh — Mon Planificateur de Repas & Budget",
  description: "Planifiez vos repas, sauvegardez vos recettes et gérez votre budget.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header user={user} />
        <div className="container main-content">
          {children}
        </div>
      </body>
    </html>
  );
}
