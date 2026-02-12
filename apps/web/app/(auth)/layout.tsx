export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--muted)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">7Roars Agency OS</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Internal agency management platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
