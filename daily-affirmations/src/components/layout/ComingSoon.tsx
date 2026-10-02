export function ComingSoon({ feature }: { feature: string }) {
  return (
    <main className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-xl font-semibold text-foreground">{feature}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">This screen is coming in a future milestone.</p>
    </main>
  );
}
