export function CorporateSocialProof() {
  const quotes = [
    {
      text: "Finance and legal were cheering for each other by Week 2 — sending voice notes at 6am about the leaderboard. I didn't even know they knew each other's names.",
      name: 'Rashida',
      role: 'Company Head · R&A Associates · 53 participants · 40 days',
      featured: true,
    },
    {
      text: 'We expected fitness results. We got a team that actually knows each other. People planning morning walks across departments by Week 3. Worth more than any offsite.',
      name: 'Sandeep',
      role: 'League Host · Rotary Fitness League · 51 participants · 40 days',
      featured: false,
    },
    {
      text: 'The 60-year-old partner who refused to join a fitness app ended up logging the most steps in the league. His team made him captain for Season 2.',
      name: 'League participant',
      role: 'Corporate League · Law Firm · Hyderabad · 53 participants',
      featured: false,
    },
  ];

  return (
    <section className="bg-[#1A2B4A] px-12 py-10 max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        What league hosts are saying
      </div>
      <div className="grid grid-cols-3 gap-5 mt-6 max-md:flex max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:[&::-webkit-scrollbar]:hidden max-md:gap-4 max-md:pb-4">
        {quotes.map((q, i) => (
          <div
            key={i}
            className={`${
              q.featured
                ? 'bg-[rgba(242,101,34,0.09)] border-[rgba(242,101,34,0.4)]'
                : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]'
            } border rounded-[6px] px-5 py-5 pb-4 flex flex-col gap-[0.875rem] max-md:flex-[0_0_85%] max-md:snap-start`}
          >
            <div className="corp-font-bebas text-[2.2rem] text-[#F26522] leading-[0.55] opacity-80">
              &ldquo;
            </div>
            <div className="text-[0.86rem] text-[rgba(255,255,255,0.82)] leading-[1.68] italic font-light flex-1">
              {q.text}
            </div>
            <div className="border-t border-[rgba(255,255,255,0.08)] pt-3">
              <div className="font-semibold text-[0.82rem] text-white">
                {q.name}
              </div>
              <div className="text-[0.66rem] text-[rgba(255,255,255,0.38)] corp-font-mono mt-[2px]">
                {q.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
