/** Skeleton de la ficha de cliente durante la navegación (antes del primer fetch). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="h-8 w-24 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mb-5 h-9 w-64 rounded bg-gray-200" />
      <div className="h-44 rounded-lg border bg-gray-100" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
      </div>
      <div className="mt-4 h-48 rounded-lg border bg-gray-100" />
    </div>
  );
}
