export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      {eyebrow && (
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal mb-3">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl md:text-4xl font-bold text-balance mb-3">{title}</h2>
      {description && <p className="text-ink/60 text-lg text-balance">{description}</p>}
    </div>
  );
}
