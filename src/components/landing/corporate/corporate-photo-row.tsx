export function CorporatePhotoRow() {
  return (
    <div className="grid grid-cols-2 gap-0 max-md:grid-cols-1">
      {/* Left photo */}
      <div className="relative overflow-hidden">
        <img
          src="/images/dillon-wanner-ciqbTWuGgBI-unsplash.jpg"
          alt="Group yoga outdoor team fitness"
          className="w-full h-[360px] object-cover block brightness-[0.62] max-md:h-[250px]"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-7">
          <div className="corp-font-mono text-[0.6rem] tracking-[2px] text-[rgba(255,255,255,0.6)] uppercase mb-[0.35rem]">
            Daily Activities
          </div>
          <div className="corp-font-bebas text-[1.7rem] text-white leading-[1.05] tracking-[0.5px]">
            Fitness, bonding —<br />
            every single day.
          </div>
          <div className="text-[0.78rem] text-[rgba(255,255,255,0.65)] mt-[0.35rem] leading-[1.5]">
            Morning jog, lunch walk, evening badminton — each logged activity
            earns the team points and creates another reason to connect with a
            colleague.
          </div>
        </div>
      </div>
      {/* Right photo */}
      <div className="relative overflow-hidden">
        <img
          src="/images/gabin-vallet-J154nEkpzlQ-unsplash.jpg"
          alt="Badminton doubles team challenge"
          className="w-full h-[360px] object-cover block brightness-[0.62] max-md:h-[250px]"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-7">
          <div className="corp-font-mono text-[0.6rem] tracking-[2px] text-[rgba(255,255,255,0.6)] uppercase mb-[0.35rem]">
            Bonus Challenges
          </div>
          <div className="corp-font-bebas text-[1.7rem] text-white leading-[1.05] tracking-[0.5px]">
            Table tennis, cricket,
            <br />
            plank relay. Drama.
          </div>
          <div className="text-[0.78rem] text-[rgba(255,255,255,0.65)] mt-[0.35rem] leading-[1.5]">
            Team challenges every week — time-limited, high-energy events that
            create the moments teammates talk about long after the league ends.
          </div>
        </div>
      </div>
    </div>
  );
}
