export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-48 rounded bg-gray-200" />
      <div className="mb-4 h-9 w-full max-w-xl rounded bg-gray-100" />
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
