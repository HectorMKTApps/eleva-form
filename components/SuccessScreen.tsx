interface SuccessScreenProps {
  submissionId: string;
  onStartNew: () => void;
}

export default function SuccessScreen({ submissionId, onStartNew }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-elevacx-accent-gradient text-3xl">
        ✓
      </div>
      <h2 className="text-2xl font-bold text-elevacx-text">
        Application Submitted Successfully
      </h2>
      <p className="max-w-sm text-elevacx-placeholder">
        Thank you for submitting your application. We have received your information.
      </p>
      <p className="rounded-lg border border-elevacx-panelBorder bg-elevacx-inputBg px-4 py-2 font-mono text-sm text-elevacx-text">
        Application ID: {submissionId}
      </p>
      <button
        type="button"
        onClick={onStartNew}
        className="mt-2 rounded-lg bg-elevacx-accent-gradient px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Start a New Application
      </button>
    </div>
  );
}
