export function CorporateStats() {
  const stats = [
    { value: '92%', label: 'Rated 4–5 stars' },
    { value: '100%', label: 'Fitness improvement' },
    { value: '76%', label: 'Wanted Season 2' },
    { value: '84%', label: 'Daily active rate' },
    { value: '#1', label: 'Outcome: New friendships' },
  ];

  return (
    <div className="bg-[#F26522] px-12 py-5 grid grid-cols-5 gap-4 text-center max-md:grid-cols-2 max-md:px-4 max-md:py-4 max-md:gap-3">
      {stats.map((stat, i) => (
        <div key={i}>
          <div className="corp-font-bebas text-[2.2rem] text-white leading-none max-md:text-[1.6rem]">
            {stat.value}
          </div>
          <div className="text-[0.65rem] text-[rgba(255,255,255,0.78)] mt-[2px] tracking-[0.3px] max-md:text-[0.58rem]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
