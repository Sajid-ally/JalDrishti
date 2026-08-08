import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          404
        </p>
        <h1 className="mt-4 text-4xl font-black text-slate-950">Page not found</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button variant="primary">Back to home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
