import Link from "next/link";

const CHIPS = [
  { label: "Tendances", href: "/recipes?sort=views" },
  { label: "Poulet", href: "/recipes?search=poulet" },
  { label: "Végé", href: "/recipes?search=v%C3%A9g%C3%A9" },
  { label: "Rapide", href: "/recipes?maxTime=30" },
  { label: "Dessert", href: "/recipes?category=DESSERT" },
];

export function LandingChips() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
      {CHIPS.map(({ label, href }, i) => (
        <Link
          key={label}
          href={href}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5 ${
            i === 0
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30"
              : "border border-stone-200 bg-white/80 text-stone-600 backdrop-blur-sm hover:border-emerald-300 hover:text-emerald-700"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
