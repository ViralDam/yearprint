/** Placeholder while the edition and the player's game load. */
export function PaperSkeleton() {
  return (
    <div
      className="mx-auto mt-4 max-w-[880px] px-3.5"
      aria-busy="true"
      aria-label="Loading the edition"
    >
      <div className="newsprint p-[clamp(18px,4.5vw,40px)]">
        <div className="border-b-4 border-double border-rule pb-3 text-center">
          <div className="mx-auto h-[clamp(38px,9vw,68px)] w-3/4 animate-pulse rounded-sm bg-rule/10" />
          <div className="mx-auto mt-3 h-4 w-1/3 animate-pulse rounded-sm bg-rule/10" />
        </div>
        <div className="mt-6 grid gap-6 min-[701px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="h-14 w-2/3 animate-pulse rounded-sm bg-rule/10" />
            <div className="aspect-[3/2] animate-pulse bg-rule/10" />
          </div>
          <div className="space-y-3">
            <div className="h-8 animate-pulse rounded-sm bg-rule/10" />
            <div className="aspect-[3/2] animate-pulse bg-rule/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
