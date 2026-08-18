export function Spinner({ large = false }) {
  return (
    <div
      className={large ? 'spinner spinner-lg' : 'spinner'}
      aria-label="Memuat..."
      role="status"
    />
  );
}
