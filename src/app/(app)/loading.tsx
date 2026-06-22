/** Skeleton mostrado durante la navegación entre pantallas de la app. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-7 w-48 rounded bg-gray-200" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border bg-gray-100" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-lg border bg-gray-100" />
        <div className="h-56 rounded-lg border bg-gray-100" />
      </div>
    </div>
  );
}
