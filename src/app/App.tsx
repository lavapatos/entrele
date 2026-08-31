export default function App() {
  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-10 text-stone-950">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-xl flex-col justify-center">
        <header className="mb-10">
          <p className="mb-2 text-sm tracking-wide text-stone-600">Juego diario de palabras</p>
          <h1 className="text-4xl font-semibold tracking-tight">ENTRELE</h1>
        </header>

        <section aria-labelledby="game-placeholder-title">
          <h2 id="game-placeholder-title" className="sr-only">
            Área de juego
          </h2>

          <div className="border-y border-stone-300 py-12 text-center">
            <p className="text-sm text-stone-600">Área de juego</p>
          </div>

          <p className="mt-4 text-sm text-stone-600" role="status">
            Estado: prototipo
          </p>
        </section>
      </div>
    </main>
  )
}
