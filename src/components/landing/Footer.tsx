import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-ink/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-ink/50">
        <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={20} />
          <div className="flex gap-6 font-mono text-xs">
            <a href="mailto:techtig9@gmail.com" className="hover:text-ink">
              techtig9@gmail.com
            </a>
            <a href="tel:+92348859789" className="hover:text-ink">
              +92 348 8597892
            </a>
          </div>
        </div>
        <div className="flex w-full flex-col items-center justify-between gap-3 border-t border-ink/10 pt-4 sm:flex-row">
          <div className="flex gap-5 text-xs">
            <a href="/terms" className="hover:text-ink">
              Terms of Service
            </a>
            <a href="/privacy" className="hover:text-ink">
              Privacy Policy
            </a>
          </div>
          <span className="text-xs">© {new Date().getFullYear()} Techtig. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
