import Image from "next/image";

<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {templates?.map((template) => (
    <div
      key={template.id}
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]"
    >
      <div className="relative h-52">
        <Image
          src={template.thumbnail}
          alt={template.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-white">
          {template.name}
        </h3>

        <p className="text-sm text-white/50">
          {template.category}
        </p>

        <p className="mt-2 text-xs text-violet-400">
          {template.tier_required} plan
        </p>

        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-violet px-4 py-2 text-sm text-white">
            Use Template
          </button>

          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white">
            Preview
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
