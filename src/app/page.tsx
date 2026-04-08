import ProspectQualifier from "@/components/ProspectQualifier";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Prospect Qualifier
          </h1>
          <p className="mt-3 text-base text-text-secondary">
            Qualifie tes prospects LinkedIn avec l&apos;IA. Score ICP, signaux
            d&apos;intention et message d&apos;accroche personnalise.
          </p>
        </header>
        <ProspectQualifier />
      </div>
    </main>
  );
}
