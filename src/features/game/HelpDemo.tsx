const DEMO_WORDS = {
  initialLower: 'AAAAA',
  before: 'MARÍA',
  outside: 'ZORRO',
  after: 'PAPAS',
  initialUpper: 'ZZZZZ',
} as const

export default function HelpDemo() {
  return (
    <div className="help-demo" aria-hidden="true">
      <div className="help-demo-board">
        <DemoWord word={DEMO_WORDS.initialLower} className="help-demo-bound help-demo-lower" />
        <DemoWord word={DEMO_WORDS.before} className="help-demo-word-before" />
        <DemoWord word={DEMO_WORDS.outside} className="help-demo-word-outside" />
        <DemoWord word={DEMO_WORDS.after} className="help-demo-word-after" />
        <DemoWord word={DEMO_WORDS.initialUpper} className="help-demo-bound help-demo-upper" />
      </div>

      <span className="help-demo-attempts">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="help-demo-attempt" key={index} />
        ))}
      </span>
    </div>
  )
}

function DemoWord({ word, className }: Readonly<{ word: string; className: string }>) {
  return (
    <span className={`help-demo-word ${className}`}>
      {[...word].map((letter, index) => (
        <span className="help-demo-tile" key={`${letter}-${index}`}>
          {letter}
        </span>
      ))}
    </span>
  )
}
