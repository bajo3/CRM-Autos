/**
 * Skeletons reutilizables para los `loading.tsx` de cada ruta. El App Router
 * los muestra al instante (boundary prefetcheado) mientras el Server Component
 * de la página resuelve sus datos, para que ninguna navegación se sienta "trabada".
 */

export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="mb-4 h-8 w-48 rounded bg-gray-200" />
      <div className="mb-4 h-9 w-full max-w-xl rounded bg-gray-100" />
      <div className="space-y-2 rounded-lg border bg-card p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
      <div className="mb-1 h-7 w-56 rounded bg-gray-200" />
      <div className="mb-5 h-4 w-80 rounded bg-gray-100" />
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-gray-200" />
              <div className="h-9 rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-9 w-24 rounded bg-gray-100" />
          <div className="h-9 w-24 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export function FichaSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-gray-200" />
          <div className="h-8 w-20 rounded bg-gray-200" />
        </div>
      </div>
      <div className="mb-5 h-9 w-72 rounded bg-gray-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-lg border bg-gray-100" />
        <div className="h-56 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
      </div>
    </div>
  );
}
