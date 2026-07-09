/** Skeleton mostrado durante la navegación entre pantallas de la app. */
export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48 rounded-md" />
          <div className="skeleton h-4 w-32 rounded-md" />
        </div>
        <div className="skeleton h-9 w-28 rounded-md" />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border bg-card p-4">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-6 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-40 w-full rounded-md" />
        </div>
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-40 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
