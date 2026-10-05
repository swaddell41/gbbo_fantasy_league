const FLAG_COLORS = ['#d9677a', '#3f9bc4', '#efe2c8']

// A row of downward triangles under the header: 26×22 on phones, 32×28 from md up
export default function Bunting() {
  return (
    <div className="flex h-[22px] overflow-hidden md:h-[28px]" aria-hidden>
      {Array.from({ length: 80 }, (_, i) => (
        <div
          key={i}
          className="h-0 w-0 flex-none border-x-[13px] border-t-[22px] border-x-transparent md:border-x-[16px] md:border-t-[28px]"
          style={{ borderTopColor: FLAG_COLORS[i % 3] }}
        />
      ))}
    </div>
  )
}
