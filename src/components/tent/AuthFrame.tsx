import Bunting from './Bunting'
import Wordmark from './Wordmark'

// Shared frame for sign in / sign up (designs 1c and 2e)
export default function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <div className="mt-12 md:mt-0">
        <Bunting />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-7 pb-10 pt-11 md:pt-20">
        <div>
          <Wordmark className="text-[22px]" />
          <h1 className="mt-5 font-display text-[44px] leading-[1.02] md:text-[52px]">{title}</h1>
          <p className="mt-3 text-[17px] text-ink-muted">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

export const authInput =
  'rounded-[14px] border-2 border-input bg-card px-4 py-3.5 text-[17px] text-ink placeholder:text-ink-faint focus:border-rose focus:outline-none'

export const authLabel = 'flex flex-col gap-1.5 text-[15px] font-semibold'

export const authButton =
  'rounded-full bg-rose p-[17px] text-[17px] font-bold text-ink hover:brightness-105 disabled:opacity-50'
