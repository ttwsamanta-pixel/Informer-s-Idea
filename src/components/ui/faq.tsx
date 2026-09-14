export function FAQ({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <section className="faq">
      <div>
        <span className="eyebrow">GOOD TO KNOW</span>
        <h2>A few things you might be wondering</h2>
      </div>
      <div>
        {items.map((i) => (
          <details key={i.question}>
            <summary>
              {i.question}
              <span>+</span>
            </summary>
            <p>{i.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
