const p=JSON.parse(require("fs").readFileSync(process.argv[2],"utf8"));const c=p.personas.casual,k=p.personas.skilled;
const m=a=>a.reduce((x,y)=>x+y,0)/a.length;const t=22;
console.log("late casual",m(c.slice(-t)).toFixed(3),"late skilled",m(k.slice(-t)).toFixed(3),"mid",m(c.slice(t,-t)).toFixed(3));
console.log(c.map((v,i)=>(i+1)+":"+Math.round(v*100)).join(" "));console.log("dups",JSON.stringify(p.duplicates));
