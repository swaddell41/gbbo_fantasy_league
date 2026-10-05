export default function Wordmark({ className = 'text-[21px] md:text-[26px]' }: { className?: string }) {
  return (
    <div className={`font-display whitespace-nowrap flex-none ${className}`}>
      The Bake Off <span className="italic text-rose-deep">League</span>
    </div>
  )
}
