export function CorporateOpeningDay() {
  return (
    <section
      className="px-12 py-12 bg-[#1A2B4A] scroll-mt-[60px] max-md:px-4 max-md:py-8"
      id="openingday"
    >
      <div className="corp-font-mono text-[0.64rem] tracking-[3px] uppercase text-[#F26522] mb-2">
        Opening Day
      </div>
      <h2 className="corp-font-bebas text-[clamp(1.9rem,3vw,3rem)] leading-none text-white mb-[0.65rem] max-md:text-[1.8rem] max-md:leading-[1.1]">
        The moment colleagues
        <br />
        become teammates.
      </h2>
      <p className="text-[0.9rem] text-[rgba(255,255,255,0.5)] leading-[1.7] max-w-[560px] font-light max-md:max-w-full">
        Opening Day isn&apos;t just a kickoff. It&apos;s a designed experience
        that makes the league feel real before a single activity is logged.
      </p>
      <div className="grid grid-cols-2 gap-8 mt-7 items-start max-md:grid-cols-1">
        {/* Steps */}
        <div className="flex flex-col gap-[0.875rem]">
          {/* Step 1 */}
          <div className="flex gap-4 items-start p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[6px]">
            <div className="corp-font-bebas text-[1.8rem] text-[#F26522] leading-none min-w-[32px] text-center">
              1
            </div>
            <div>
              <div className="font-semibold text-[0.9rem] text-white mb-1">
                Team reveal — the big moment
              </div>
              <div className="text-[0.78rem] text-[rgba(255,255,255,0.5)] leading-[1.55]">
                Players arrive not knowing their team. Names called one by one.
                The room erupts. New teammates meet — the first bonds of the
                league form right here.
              </div>
            </div>
          </div>
          {/* Step 2 */}
          <div className="flex gap-4 items-start p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[6px]">
            <div className="corp-font-bebas text-[1.8rem] text-[#F26522] leading-none min-w-[32px] text-center">
              2
            </div>
            <div>
              <div className="font-semibold text-[0.9rem] text-white mb-1">
                Captain &amp; vice-captain election
              </div>
              <div className="text-[0.78rem] text-[rgba(255,255,255,0.5)] leading-[1.55]">
                Each team nominates and votes for their captain live. Leadership
                emerges organically — sometimes from the most surprising people
                in the room.
              </div>
            </div>
          </div>
          {/* Step 3 */}
          <div className="flex gap-4 items-start p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[6px]">
            <div className="corp-font-bebas text-[1.8rem] text-[#F26522] leading-none min-w-[32px] text-center">
              3
            </div>
            <div>
              <div className="font-semibold text-[0.9rem] text-white mb-1">
                Team name, jersey &amp; war cry
              </div>
              <div className="text-[0.78rem] text-[rgba(255,255,255,0.5)] leading-[1.55]">
                Teams pick a name and jersey colour. Every player&apos;s jersey
                shows their name, team, and league name — live in the app the
                moment they&apos;re assigned.
              </div>
              <div className="mt-[0.875rem] rounded-lg overflow-hidden">
                <img
                  src="/images/marvin-cors-qWWawTh_IY0-unsplash.jpg"
                  alt="Colourful team sports jerseys"
                  className="w-full h-40 object-cover object-top block rounded-lg"
                />
                <div className="text-[0.7rem] text-[#6B7280] corp-font-mono tracking-[0.3px] mt-[0.4rem] text-center">
                  Each team gets their own colour — player name, team name and
                  league printed on every jersey.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-[0.35rem] mt-[0.6rem] max-md:grid-cols-1 max-md:gap-2">
                <div className="text-[0.72rem] text-white px-[0.65rem] py-[0.4rem] rounded flex items-center gap-[0.4rem] bg-[#1A2B4A] max-md:text-[0.68rem] max-md:p-2 max-md:flex-wrap">
                  🦁{' '}
                  <strong className="font-bold tracking-[0.5px]">LIONS</strong>{' '}
                  · Rashida K.{' '}
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.55)] corp-font-mono ml-auto max-md:text-[0.58rem]">
                    Captain
                  </span>
                </div>
                <div className="text-[0.72rem] text-white px-[0.65rem] py-[0.4rem] rounded flex items-center gap-[0.4rem] bg-[#C94E0E] max-md:text-[0.68rem] max-md:p-2 max-md:flex-wrap">
                  🐯{' '}
                  <strong className="font-bold tracking-[0.5px]">TIGERS</strong>{' '}
                  · Rohan S.{' '}
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.55)] corp-font-mono ml-auto max-md:text-[0.58rem]">
                    Vice-Captain
                  </span>
                </div>
                <div className="text-[0.72rem] text-white px-[0.65rem] py-[0.4rem] rounded flex items-center gap-[0.4rem] bg-[#0F6E56] max-md:text-[0.68rem] max-md:p-2 max-md:flex-wrap">
                  🦅{' '}
                  <strong className="font-bold tracking-[0.5px]">EAGLES</strong>{' '}
                  · Priya M.{' '}
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.55)] corp-font-mono ml-auto max-md:text-[0.58rem]">
                    Player
                  </span>
                </div>
                <div className="text-[0.72rem] text-white px-[0.65rem] py-[0.4rem] rounded flex items-center gap-[0.4rem] bg-[#7C3AED] max-md:text-[0.68rem] max-md:p-2 max-md:flex-wrap">
                  🐻{' '}
                  <strong className="font-bold tracking-[0.5px]">BEARS</strong>{' '}
                  · Amit T.{' '}
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.55)] corp-font-mono ml-auto max-md:text-[0.58rem]">
                    Captain
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Step 4 */}
          <div className="flex gap-4 items-start p-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-[6px]">
            <div className="corp-font-bebas text-[1.8rem] text-[#F26522] leading-none min-w-[32px] text-center">
              4
            </div>
            <div>
              <div className="font-semibold text-[0.9rem] text-white mb-1">
                Rules, scoring &amp; first challenge
              </div>
              <div className="text-[0.78rem] text-[rgba(255,255,255,0.5)] leading-[1.55]">
                Host walks through how points work and drops the first bonus
                challenge. The leaderboard is live. The fitness and bonding
                journey begins immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="rounded-lg overflow-hidden relative">
          <img
            src="/images/fiqih-alfarish-tjDpsGFTCO4-unsplash.jpg"
            alt="Large team event crowd hall cheering"
            className="w-full h-full object-cover block brightness-[0.72] min-h-[400px]"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-b from-transparent via-transparent to-[rgba(26,43,74,0.9)]">
            <div className="inline-block bg-[#F26522] text-white corp-font-mono text-[0.6rem] tracking-[2px] px-[10px] py-[3px] rounded-[2px] mb-[0.6rem] w-fit">
              Opening Day
            </div>
            <div className="corp-font-bebas text-[1.6rem] text-white tracking-[0.5px] leading-[1.05]">
              30 minutes. Colleagues become teammates.
            </div>
            <div className="text-[0.75rem] text-[rgba(255,255,255,0.6)] mt-[0.35rem] leading-[1.5]">
              Playbook included with every plan. Run it at your all-hands or
              offsite.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
