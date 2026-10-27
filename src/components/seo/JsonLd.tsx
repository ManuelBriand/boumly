// Injecte un bloc JSON-LD (données structurées schema.org) dans le HTML.
// Server Component — rendu côté serveur, crawlable.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
