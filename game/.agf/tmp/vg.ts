import { GHOSTS } from "../../src/game/ghosts";
import { verifyGhost, replayGhost } from "../../src/game/ghost";
for (const g of Object.values(GHOSTS)) { const r = replayGhost(g.unit, g.seed, g.moves); console.log(g.id, "unit", g.unit + 1, "verify", verifyGhost(g), "ok", r.ok, "pts", r.state.tl.pts, "/", g.pts); }
