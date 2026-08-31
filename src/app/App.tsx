import PrototypeGame from '../features/game/PrototypeGame'

type AppProps = Readonly<{
  now?: Date
}>

export default function App({ now }: AppProps) {
  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-10 text-stone-950">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-10">
          <p className="mb-2 text-sm tracking-wide text-stone-600">Juego diario de palabras</p>
          <h1 className="text-4xl font-semibold tracking-tight">ENTRELE</h1>
        </header>

        <PrototypeGame now={now} />
      </div>
    </main>
  )
}
