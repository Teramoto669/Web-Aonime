export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
    </div>
  )
}
