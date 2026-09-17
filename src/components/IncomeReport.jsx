function monthKeyOf(dateStr) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function IncomeReport({ payments }) {
  const paid = payments.filter((p) => p.amount != null && !Number.isNaN(Number(p.amount)));

  // group by month
  const byMonth = {};
  for (const p of paid) {
    const key = monthKeyOf(p.date_paid);
    if (!byMonth[key]) byMonth[key] = { total: 0, count: 0, byLevel: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    byMonth[key].total += Number(p.amount);
    byMonth[key].count += 1;
    const lvl = Number(p.level);
    if (byMonth[key].byLevel[lvl] != null) byMonth[key].byLevel[lvl] += Number(p.amount);
  }

  const months = Object.keys(byMonth).sort().reverse(); // most recent first
  const totalAllTime = paid.reduce((sum, p) => sum + Number(p.amount), 0);

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthTotal = byMonth[currentKey]?.total || 0;
  const lastMonthTotal = byMonth[lastKey]?.total || 0;

  // last 6 months (including current) for the trend chart, oldest first
  const trendKeys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const trendMax = Math.max(1, ...trendKeys.map((k) => byMonth[k]?.total || 0));

  return (
    <>
      <div className="page-header">
        <h1>Income report</h1>
      </div>

      <div className="stats-row">
        <div className="stat-card income"><div className="num">{thisMonthTotal.toFixed(0)}</div><div className="label">This month</div></div>
        <div className="stat-card income"><div className="num">{lastMonthTotal.toFixed(0)}</div><div className="label">Last month</div></div>
        <div className="stat-card income"><div className="num">{totalAllTime.toFixed(0)}</div><div className="label">All-time total</div></div>
      </div>

      <div className="section-title">Last 6 months</div>
      <div style={{ marginBottom: 28, background: 'var(--paper-raised)', border: '1px solid var(--line)', borderRadius: 10, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
        {trendKeys.map((k) => {
          const total = byMonth[k]?.total || 0;
          const pct = Math.round((total / trendMax) * 100);
          return (
            <div className="bar-row" key={k}>
              <div className="bar-label">{monthLabel(k)}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
              <div className="bar-value">{total.toFixed(0)}</div>
            </div>
          );
        })}
      </div>

      <div className="section-title">By month</div>
      {months.length === 0 ? (
        <div className="empty-state">
          <div className="big">No payments recorded yet</div>
          Once you start recording payments, monthly income shows up here automatically.
        </div>
      ) : (
        <table className="income-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Payments</th>
              <th className="amount">Level 1</th>
              <th className="amount">Level 2</th>
              <th className="amount">Level 3</th>
              <th className="amount">Level 4</th>
              <th className="amount">Total</th>
            </tr>
          </thead>
          <tbody>
            {months.map((k) => (
              <tr key={k}>
                <td data-label="Month">{monthLabel(k)}</td>
                <td data-label="Payments">{byMonth[k].count}</td>
                <td data-label="Level 1" className="amount">{byMonth[k].byLevel[1].toFixed(0)}</td>
                <td data-label="Level 2" className="amount">{byMonth[k].byLevel[2].toFixed(0)}</td>
                <td data-label="Level 3" className="amount">{byMonth[k].byLevel[3].toFixed(0)}</td>
                <td data-label="Level 4" className="amount">{byMonth[k].byLevel[4].toFixed(0)}</td>
                <td data-label="Total" className="amount"><strong>{byMonth[k].total.toFixed(0)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
