import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-800">
          <SearchX className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">No encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          El registro que buscás no existe o no pertenece a tu agencia.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
