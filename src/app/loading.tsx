export default function Loading() {
  return (
    <div className="page-stack" aria-busy="true" aria-label="Cargando">
      <div className="pagehead">
        <div>
          <div className="skeleton skeleton-line" style={{ width: 120 }} />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" style={{ width: 260 }} />
        </div>
      </div>
      <div className="grid-kpi">
        {[0, 1, 2, 3].map((item) => (
          <div className="card" key={item}>
            <div className="skeleton skeleton-line" style={{ width: "50%" }} />
            <div className="skeleton skeleton-value" />
          </div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="skeleton skeleton-row" key={item} />
          ))}
        </div>
        <div className="card">
          {[0, 1, 2].map((item) => (
            <div className="skeleton skeleton-row" key={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
