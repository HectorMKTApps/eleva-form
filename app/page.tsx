import ApplicationForm from "@/components/ApplicationForm";
import OpenPositions from "@/components/OpenPositions";

export default function HomePage() {
  return (
    <>
      <header className="bg-elevacx-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-xl font-extrabold tracking-tight text-white">Elevacx</span>
          <nav>
            <a href="#" className="text-sm font-medium text-elevacx-placeholder hover:text-white">
              Home
            </a>
          </nav>
        </div>
      </header>

      <section className="bg-elevacx-hero">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
            FILL OUT OUR APPLICATION FORM BELOW
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">
            Join the Elevacx team — tell us about yourself and take the first step in your
            application.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <OpenPositions />

          <div className="rounded-2xl border border-elevacx-panelBorder bg-elevacx-panel p-6 sm:p-8">
            <ApplicationForm />
          </div>
        </div>
      </main>
    </>
  );
}
