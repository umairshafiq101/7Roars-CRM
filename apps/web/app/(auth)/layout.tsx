export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F8F9FC] via-white to-[#EDE9FE]">
      <div className="w-full max-w-md px-4">
        {/* Logo and branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-lg shadow-[var(--primary)]/25">
            <svg
              width="30"
              height="30"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 6L26 16L8 26V6Z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M8 6L20 16L8 12V6Z"
                fill="#F5A623"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            7Roars <span className="text-[var(--primary)]">Agency OS</span>
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            Internal agency management platform
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
