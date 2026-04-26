'use client';

const testimonials = [
  {
    quote:
      'The 70-year-old uncle from Block C who barely left his flat was logging 8,000 steps every morning. His grandchildren were tracking his score from college in another city. I had no idea a fitness league could do this for a society.',
    name: 'Meera Iyer',
    role: 'RWA President \u00B7 Prestige Palms, Hyderabad \u00B7 186 residents \u00B7 40 days',
    featured: true,
  },
  {
    quote:
      'We had families from Wing A and Wing B who had a decade-old parking dispute. By Week 3 they were walking together at 6am as part of the same challenge. The league created neutral ground that nothing else had managed to.',
    name: 'Rajesh Nair',
    role: 'Team Captain \u00B7 Wing C \u00B7 Residential Pilot League \u00B7 40 days',
    featured: false,
  },
  {
    quote:
      'My daughter is 12 and my mother-in-law is 68. They were both logging activities, both on the same leaderboard, both contributing to our wing\u2019s score. I don\u2019t think anything has ever made them feel equal before. That alone made it worth every rupee.',
    name: 'Priya Sharma',
    role: 'Resident & Team Captain \u00B7 Community Fitness League \u00B7 Hyderabad',
    featured: false,
  },
];

export function ResidentialTestimonials() {
  return (
    <section className="px-16 py-24 bg-[#1A2B4A] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Heard from our communities
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-white max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Real societies.
        <br />
        Real stories.
      </h2>
      <div className="grid grid-cols-3 gap-6 mt-16 max-[960px]:flex max-[960px]:overflow-x-auto max-[960px]:snap-x max-[960px]:snap-mandatory max-[960px]:[-webkit-overflow-scrolling:touch] max-[960px]:gap-4 max-[960px]:pb-4 max-[960px]:w-full">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className={`rounded-md p-8 flex flex-col gap-6 max-[960px]:flex-[0_0_85%] max-[960px]:snap-start ${
              t.featured
                ? 'bg-[rgba(242,101,34,0.08)] border border-[rgba(242,101,34,0.35)]'
                : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]'
            }`}
          >
            <div className="font-['Bebas_Neue',sans-serif] text-[3rem] text-[#F26522] leading-[0.6] opacity-70">
              &ldquo;
            </div>
            <div className="text-[0.94rem] text-[rgba(255,255,255,0.82)] leading-[1.72] font-light italic flex-1">
              {t.quote}
            </div>
            <div className="border-t border-[rgba(255,255,255,0.08)] pt-4">
              <div className="font-semibold text-[0.88rem] text-white">
                {t.name}
              </div>
              <div className="text-[0.72rem] text-[rgba(255,255,255,0.38)] font-['DM_Mono',monospace] mt-[3px]">
                {t.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
