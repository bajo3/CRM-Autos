export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-32 rounded bg-gray-200" />
      <div className="space-y-2 rounded-xl border border-border/70 bg-card shadow-elevate p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
