import type { Leaderboard, LeaderboardRow } from "@/lib/game/types";

const th =
  "border-b-2 border-rule px-[7px] py-[5px] text-left font-sans text-[10.5px] font-normal tracking-[0.13em] text-ink-soft uppercase";
const td = "border-b border-rule/20 p-[7px] tabular-nums";

function Row({ row }: { row: LeaderboardRow }) {
  const you = row.you ? "bg-gold/18 font-bold" : "";
  return (
    <tr className={you}>
      <td className={`${td} font-extrabold`}>{row.rank}</td>
      <td className={td}>
        {row.name}
        {row.you && <span className="text-ink-soft"> — you</span>}
      </td>
      <td className={`${td} font-extrabold ${row.you ? "text-accent" : ""}`}>
        {row.score.toLocaleString("en-US")}
      </td>
      <td className={`${td} max-[520px]:hidden`}>{row.won ? row.guesses : "✕"}</td>
      <td className={`${td} max-[520px]:hidden`}>{row.pages}</td>
    </tr>
  );
}

/** The board table. Shows the caller's row underneath if it's outside the top rows. */
export function LeaderboardTable({ board }: { board: Leaderboard }) {
  const youShown = board.rows.some((r) => r.you);
  if (board.rows.length === 0) {
    return (
      <p className="m-0 text-[15px] text-ink-soft italic">Nobody has ranked on this edition yet.</p>
    );
  }
  return (
    <table className="w-full border-collapse text-[14.5px]">
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Player</th>
          <th className={th}>Score</th>
          <th className={`${th} max-[520px]:hidden`}>Guesses</th>
          <th className={`${th} max-[520px]:hidden`}>Pages unfolded</th>
        </tr>
      </thead>
      <tbody>
        {board.rows.map((row) => (
          <Row key={row.rank} row={row} />
        ))}
        {!youShown && board.you && (
          <>
            <tr aria-hidden="true">
              <td colSpan={5} className="py-1 text-center text-ink-faint">
                ⋯
              </td>
            </tr>
            <Row row={board.you} />
          </>
        )}
      </tbody>
    </table>
  );
}

/** One line under the board about where the caller stands. */
export function boardNote(board: Leaderboard) {
  if (board.you) {
    return `You placed #${board.you.rank} of ${board.total} on this edition's board.`;
  }
  if (board.would_be) {
    return `This game was played after the edition's day, so it isn't ranked — it would have placed #${board.would_be}.`;
  }
  return "Finished games by players with an account appear here.";
}
