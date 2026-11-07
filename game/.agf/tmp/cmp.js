const p=require("../../src/game/proof.json");const pt=require(process.argv[2]||"./pt.json");
const rows=[];for(let i=1;i<=66;i++){const q=p[i];const c=Math.round(pt.personas.casual[i-1]*100),s=Math.round(pt.personas.skilled[i-1]*100);rows.push(`${i}:${c}/${s}/m${q.casual}/w${q.wins}${s<=c+5||q.casual<58&&i>22?" *":""}`)}
console.log(rows.join("  "));
const late=pt.personas.casual.slice(44);console.log("late mean",late.reduce((a,b)=>a+b)/late.length);
