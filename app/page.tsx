import ApplicationForm from "@/components/ApplicationForm";

const BENEFITS = [
  "Competitive pay with performance-based incentives",
  "Career growth and internal promotion paths",
  "Paid training and ongoing coaching",
  "A supportive, people-first team culture",
  "Opportunities across multiple lines of business",
];

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
          <aside className="rounded-2xl bg-elevacx-accent-gradient p-6 text-white sm:p-8 lg:sticky lg:top-8 lg:self-start">
            <h2 className="text-xl font-bold sm:text-2xl">Why Join Elevacx?</h2>
            <ul className="mt-5 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm sm:text-base">
                  <span aria-hidden="true" className="mt-0.5">
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </aside>

          <div className="rounded-2xl border border-elevacx-panelBorder bg-elevacx-panel p-6 sm:p-8">
            <ApplicationForm />
          </div>
        </div>
      </main>
    </>
  );
}
