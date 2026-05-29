import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function RootPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-ighub-light">
      <div className="max-w-md w-full bg-white p-12 rounded-2xl">
        <Image className="my-8 mx-auto" width={100} height={100} src="/igcolouredlogo.png" alt="Logo" />
        {/* <h1 className="text-xl font-bold tracking-tight text-ighub-black mb-2">
          IGHub Portal Engine
        </h1> */}
        <p className="text-sm text-gray-500 mb-8 balance">
          Enter a specific event handle or contact administration to access customized portal registrations.
        </p>

        <div className="space-y-3">
          <Link href="/admin" className="block w-full">
            <Button variant="primary">
              Access Admin Console
            </Button>
          </Link>
        </div>
      </div>

      <footer className="mt-12 text-xs font-medium text-gray-400">
        &copy; {new Date().getFullYear()} Innovation Growth Hub.
      </footer>
    </main>
  );
}