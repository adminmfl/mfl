export function CorporateProblem() {
  const problems = [
    {
      icon: '👤',
      title: 'Built for individuals',
      desc: 'No one truly cares about their own streak. People care about not letting their team down. Individual apps miss this entirely.',
    },
    {
      icon: '📉',
      title: 'Dead by Week 3',
      desc: 'Corporate wellness app engagement drops 70% after the first month. No social pressure, no reason to continue.',
    },
    {
      icon: '🔇',
      title: 'Zero cross-team bonding',
      desc: "Finance and Operations don't know each other exists. Engagement surveys flag it every year. A shared league fixes this in 40 days.",
    },
  ];

  return (
    <section className="px-12 py-12 bg-[#1A2B4A] scroll-mt-[60px] max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Why not just use a wellness app
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-white mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Individual apps don&apos;t
        <br />
        build teams.
      </h2>
      <div className="grid grid-cols-3 gap-[1px] mt-7 bg-[rgba(255,255,255,0.07)] max-md:flex max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:[&::-webkit-scrollbar]:hidden max-md:gap-4 max-md:pb-4 max-md:bg-transparent">
        {problems.map((p, i) => (
          <div
            key={i}
            className="bg-[#1A2B4A] p-6 px-5 max-md:flex-[0_0_85%] max-md:snap-start"
          >
            <div className="text-[1.3rem] mb-[0.6rem]">{p.icon}</div>
            <div className="font-semibold text-[0.9rem] text-white mb-[0.3rem]">
              {p.title}
            </div>
            <div className="text-[0.78rem] text-[rgba(255,255,255,0.38)] leading-[1.58]">
              {p.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
