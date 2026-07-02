export default function Loading() {
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
      <div className="mb-5 flex gap-2">
        <div className="h-8 w-28 rounded bg-gray-100" />
        <div className="h-8 w-24 rounded bg-gray-100" />
        <div className="h-8 w-44 rounded bg-gray-100" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-lg border bg-gray-100" />
        <div className="h-56 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
        <div className="h-40 rounded-lg border bg-gray-100" />
      </div>
    </div>
  );
}
