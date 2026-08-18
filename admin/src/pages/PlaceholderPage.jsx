export default function PlaceholderPage({ title, description }) {
  return (
    <main className="content-page">
      <div className="page-heading-row">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="panel empty-panel">
        <h2>{title} module</h2>
        <p>This workspace is ready for the next implementation step.</p>
      </section>
    </main>
  );
}