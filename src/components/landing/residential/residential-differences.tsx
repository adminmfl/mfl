'use client';

const cards = [
  {
    icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}',
    title: 'Multi-generational teams',
    desc: 'Teams are balanced across age groups \u2014 grandparents, parents, and teenagers on the same side. A 70-year-old\u2019s morning walk earns as many points as a 25-year-old\u2019s gym session.',
  },
  {
    icon: '\u{1F3E2}',
    title: 'Wing vs wing drama',
    desc: 'Teams organised by wing, tower, villa cluster or block. The natural rivalry already exists \u2014 MFL gives it a leaderboard, a rulebook, and a trophy.',
  },
  {
    icon: '\u{1F91D}',
    title: 'Neighbours become friends',
    desc: 'The family you\u2019ve seen in the lift for three years but never spoken to is now on your team. By Week 2, you\u2019re planning morning walks together. That\u2019s the MFL effect.',
  },
];

export function ResidentialDifferences() {
  return (
    <section className="px-16 py-24 bg-[#1A2B4A] scroll-mt-[60px] max-[960px]:px-4 max-[960px]:py-10 max-[960px]:w-full">
      <div className="font-['DM_Mono',monospace] text-[0.68rem] tracking-[3px] uppercase text-[#F26522] mb-4">
        Built for communities, not just offices
      </div>
      <h2 className="font-['Bebas_Neue',sans-serif] text-[clamp(2.4rem,3.8vw,3.8rem)] leading-none mb-4 text-white max-[960px]:text-[1.8rem] max-[960px]:leading-[1.1]">
        Designed for the
        <br />
        full spectrum of life.
      </h2>
      <p className="text-base text-[rgba(255,255,255,0.45)] leading-[1.75] max-w-[560px] font-light max-[960px]:max-w-full">
        Corporate leagues have one age group. Your society has eight-year-olds
        and eighty-year-olds. MFL for communities is built for that beautiful
        complexity.
      </p>
      <div className="grid grid-cols-3 gap-[1px] mt-16 bg-[rgba(255,255,255,0.07)] max-[960px]:flex max-[960px]:overflow-x-auto max-[960px]:snap-x max-[960px]:snap-mandatory max-[960px]:[-webkit-overflow-scrolling:touch] max-[960px]:gap-4 max-[960px]:pb-4 max-[960px]:w-full">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-[#1A2B4A] px-8 py-10 max-[960px]:flex-[0_0_85%] max-[960px]:snap-start"
          >
            <div className="w-10 h-10 rounded-[4px] border border-[rgba(15,110,86,0.4)] bg-[rgba(15,110,86,0.08)] flex items-center justify-center text-[1.2rem] mb-5">
              {card.icon}
            </div>
            <div className="font-semibold text-base text-white mb-2">
              {card.title}
            </div>
            <div className="text-[0.84rem] text-[rgba(255,255,255,0.38)] leading-[1.65]">
              {card.desc}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
