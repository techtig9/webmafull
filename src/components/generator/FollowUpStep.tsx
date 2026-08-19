"use client";

import { Button } from "@/components/ui/Button";

export interface FollowUpQuestion {
  key: string;
  label: string;
  options: string[];
}

export function FollowUpStep({
  questions,
  answers,
  onAnswer,
  onGenerate,
  onSkip,
  generating,
}: {
  questions: FollowUpQuestion[];
  answers: Record<string, string>;
  onAnswer: (key: string, value: string) => void;
  onGenerate: () => void;
  onSkip: () => void;
  generating: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="font-display text-xl font-bold">A few quick preferences</h2>
      <p className="mt-1 text-sm text-ink/50">
        Pick what fits, or skip and we'll choose sensible defaults.
      </p>

      <div className="mt-6 space-y-6">
        {questions.map((q) => (
          <div key={q.key}>
            <p className="mb-2 text-xs font-medium text-ink/60">{q.label}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onAnswer(q.key, opt)}
                  className={`focus-ring rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    answers[q.key] === opt
                      ? "border-signal bg-signal text-paper"
                      : "border-ink/15 text-ink/70 hover:border-ink"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="secondary" onClick={onSkip} disabled={generating} className="flex-1">
          Skip
        </Button>
        <Button onClick={onGenerate} disabled={generating} className="flex-1">
          {generating ? "Generating…" : "Generate website"}
        </Button>
      </div>
    </div>
  );
}
