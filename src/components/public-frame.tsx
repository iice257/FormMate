export function PublicFrame({ children }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-8 px-4 py-6 md:px-8 md:py-8">
        {children}
      </div>
    </div>
  );
}
