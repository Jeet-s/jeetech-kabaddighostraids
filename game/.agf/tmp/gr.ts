import { GHOSTS } from "../../src/game/ghosts";
import { ghostRaids, ghostRaidText } from "../../src/game/ghost";
for (const g of Object.values(GHOSTS)) console.log(g.id, g.unit + 1, g.pts, ghostRaids(g).map(ghostRaidText).join(" | "));
