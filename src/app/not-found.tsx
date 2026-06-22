import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-brand-800">404</p>
        <h1 className="mt-2 text-xl font-semibold text-gray-900">Página no encontrada</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
