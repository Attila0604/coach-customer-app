// Wiederverwendbarer Sticky-Header im nativen App-Stil. Milchglas-Optik wie die
// untere Tab-Leiste, untere Hairline, Safe-Area oben (Notch). `title` = großer
// Seitentitel, `eyebrow` = optionaler kleiner Gold-Text darüber.

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
};

export default function AppHeader({ title, eyebrow }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-ink-900/80 backdrop-blur-xl border-b border-white/[0.08] pt-[env(safe-area-inset-top)]">
      <div className="max-w-md mx-auto px-6 py-3.5">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-caps text-gold font-medium mb-0.5">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-xl text-bone leading-tight font-normal">
          {title}
        </h1>
      </div>
    </header>
  );
}
