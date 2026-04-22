export function CorporateWhatIsIt() {
  const cards = [
    {
      img: '/images/aleksandrs-karevs-WadTdbyDE94-unsplash.jpg',
      alt: 'Group running in park',
      tag: 'Teams, not individuals',
      title: 'Get fit together, bond for real',
      desc: 'Every point goes to your team — so the accountant pushes the CEO and the new joiner keeps up with the MD. Fitness improves. Friendships form. Both happen at once.',
    },
    {
      img: '/images/dillon-wanner-ciqbTWuGgBI-unsplash.jpg',
      alt: 'Outdoor sport team fitness',
      tag: 'Daily activities',
      title: 'Steps, walks, sport — your choice',
      desc: 'Morning jog, lunch walk, evening badminton, home yoga — each player logs what suits them and earns points for the team. Consistency beats intensity.',
    },
    {
      img: '/images/anna-stampfli-q0PZ3BoFmCE-unsplash.jpg',
      alt: 'Team celebration',
      tag: 'Challenges + grand finale',
      title: 'Drama, trophies, legends',
      desc: 'Team challenges every week, and a live Grand Finale with trophies, individual awards, and a season card for every participant. The league that keeps getting talked about.',
    },
  ];

  return (
    <section className="px-12 py-12 bg-white scroll-mt-[60px] max-md:px-4 max-md:py-8">
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        What is MFL
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-[#1A2B4A] mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        Fitness that builds
        <br />
        real team bonds.
      </h2>
      <div className="grid grid-cols-3 gap-5 mt-7 max-md:flex max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:[&::-webkit-scrollbar]:hidden max-md:gap-4 max-md:pb-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden border border-[rgba(26,43,74,0.1)] max-md:flex-[0_0_85%] max-md:snap-start"
          >
            <img
              src={card.img}
              alt={card.alt}
              className="w-full h-40 object-cover block"
            />
            <div className="px-4 py-[0.875rem] pb-[1.1rem]">
              <div className="inline-block bg-[#FDE8DC] text-[#C94E0E] corp-font-mono text-[0.6rem] tracking-[1.5px] px-[7px] py-[2px] rounded-[2px] mb-[0.4rem]">
                {card.tag}
              </div>
              <div className="font-semibold text-[0.92rem] text-[#1A2B4A] mb-1">
                {card.title}
              </div>
              <div className="text-[0.8rem] text-[#6B7280] leading-[1.6]">
                {card.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
