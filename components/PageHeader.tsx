import Link from "next/link";
import AppHamburgerMenu from "@/components/AppHamburgerMenu";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
};

export default function PageHeader({ title, subtitle, backHref, backLabel }: PageHeaderProps) {
  return (
    <header className="px-1 pb-2 pt-1">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-xl text-slate-700 shadow-sm"
        >
          ‹
        </Link>

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-xl font-black text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        <div className="flex h-10 w-10 items-center justify-center">
          <AppHamburgerMenu inline />
        </div>
      </div>
    </header>
  );
}