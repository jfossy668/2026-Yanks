const API="https://statsapi.mlb.com/api/v1",Y=147,SEASON=2026;
const $=x=>document.getElementById(x);
async function api(p){const r=await fetch(API+p);if(!r.ok)throw Error(r.status);return r.json()}
const pct=x=>(x*100).toFixed(1)+"%", f3=x=>x==null?"—":Number(x).toFixed(3).replace("0.","."), n=x=>x==null?"—":Number(x).toLocaleString();
function pythag(rs,ra){return (rs**1.83)/(rs**1.83+ra**1.83)}
function stat(label,val){return `<div class="stat"><b>${val??"—"}</b><span>${label}</span></div>`}
async function load(){
 $("updated").textContent="loading…";
 try{
  const today=new Date().toISOString().slice(0,10);
  const [st,sch,hit,pit,people]=await Promise.all([
   api(`/standings?leagueId=103&season=${SEASON}&standingsTypes=regularSeason`),
   api(`/schedule?teamId=${Y}&season=${SEASON}&sportId=1&gameTypes=R&startDate=${today}&endDate=2026-10-01&hydrate=team`),
   api(`/teams/${Y}/stats?stats=season&group=hitting&season=${SEASON}`),
   api(`/teams/${Y}/stats?stats=season&group=pitching&season=${SEASON}`),
   api(`/stats?stats=season&group=hitting&season=${SEASON}&sportIds=1&teamId=${Y}&limit=12&sortStat=ops&order=desc`)
  ]);
  const rows=st.records.flatMap(r=>r.teamRecords||[]), y=rows.find(r=>r.team.id===Y), w=y.leagueRecord.wins,l=y.leagueRecord.losses,total=w+l,p=w/total;
  $("record").textContent=`${w}–${l}`;$("subrecord").textContent=`${f3(p)} • ${y.gamesBack||"0"} GB in AL East`;
  $("pct").textContent=f3(p);$("runDiff").textContent=(y.runsScored-y.runsAllowed>=0?"+":"")+(y.runsScored-y.runsAllowed);$("remaining").textContent=162-total;$("last10").textContent=y.records?.[0]?.wins??"—";
  $("divisionRank").textContent=`AL EAST #${y.divisionRank||"—"}`;
  const leaders=rows.filter(r=>r.team.division?.league?.id===103).sort((a,b)=>b.leagueRecord.wins-a.leagueRecord.wins);
  const maxOther=Math.max(...leaders.filter(r=>r.team.id!==Y).map(r=>r.leagueRecord.wins+(162-r.leagueRecord.wins-r.leagueRecord.losses)),0);
  const magic=Math.max(0,maxOther+1-w);
  $("playoffStatus").textContent=w>maxOther?"PLAYOFFS MATHEMATICALLY SAFE":"PLAYOFFS NOT CLINCHED";
  $("clinch").innerHTML=[["AL EAST MAGIC",magic||"CLINCHED"],["MAX YANKEES WINS",w+(162-total)],["AL WILD CARD","SEE WILD CARD"],["ELIMINATION","CALCULATING"]].map(x=>`<div class="watch"><span class="label">${x[0]}</span><b>${x[1]}</b></div>`).join("");

  const divisions={200:"AL East",201:"AL Central",202:"AL West"};
  $("standings").innerHTML=[200,201,202].map(d=>{
   const rs=rows.filter(r=>r.team.division?.id===d).sort((a,b)=>b.leagueRecord.wins-a.leagueRecord.wins);
   return `<div class="division"><h3>${divisions[d]}</h3><table><thead><tr><th>TEAM</th><th>W</th><th>L</th><th>PCT</th><th>GB</th></tr></thead><tbody>${rs.map(r=>`<tr class="${r.team.id===Y?"yank":""}"><td>${r.team.name}</td><td>${r.leagueRecord.wins}</td><td>${r.leagueRecord.losses}</td><td>${f3(r.leagueRecord.wins/(r.leagueRecord.wins+r.leagueRecord.losses))}</td><td>${r.gamesBack}</td></tr>`).join("")}</tbody></table></div>`
  }).join("");

  const games=sch.dates?.flatMap(d=>d.games||[])||[], future=games.filter(g=>g.status.abstractGameState!=="Final");
  let expected=0;
  $("schedule").innerHTML=future.map(g=>{
   const home=g.teams.home.team.id===Y, opp=home?g.teams.away.team:g.teams.home.team, or=rows.find(r=>r.team.id===opp.id)?.leagueRecord, op=or?or.wins/(or.wins+or.losses):.5;
   const py= y.runsScored&&y.runsAllowed?pythag(y.runsScored,y.runsAllowed):p;
   let prob=.5+(py-op)*.75+(home?.035:0);
   prob=Math.max(.2,Math.min(.8,prob));expected+=prob;
   return `<tr><td>${new Date(g.gameDate).toLocaleDateString()}</td><td>${opp.name}</td><td>${home?"HOME":"AWAY"}</td><td>${or?or.wins+"–"+or.losses:"—"}</td><td>${pct(prob)}</td><td class="${prob>=.5?"win":"loss"}">${prob>=.5?"W":"L"}</td></tr>`
  }).join("")||`<tr><td colspan="6">No remaining games found.</td></tr>`;
  $("scheduleCount").textContent=`${future.length} GAMES`;
  const proj=Math.round(w+expected), spread=Math.max(3,Math.round(Math.sqrt(future.length)*2.3));
  $("projected").textContent=`${proj}–${162-proj}`;$("expectedWins").textContent=proj;$("range").textContent=`${Math.max(0,proj-spread)}–${Math.min(162,proj+spread)}`;
  const playoff=Math.max(1,Math.min(99,50+(proj-81)*3.5));$("playoffOdds").textContent=Math.round(playoff)+"%";$("projBar").style.width=playoff+"%";

  const hs=hit.stats?.[0]?.splits?.[0]?.stat||{}, ps=pit.stats?.[0]?.splits?.[0]?.stat||{};
  $("offense").innerHTML=[["AVG",hs.avg],["OBP",hs.obp],["SLG",hs.slg],["OPS",hs.ops],["HR",hs.homeRuns],["RBI",hs.rbi],["RUNS",hs.runs],["BB",hs.baseOnBalls],["SO",hs.strikeOuts]].map(x=>stat(...x)).join("");
  $("pitching").innerHTML=[["ERA",ps.era],["WHIP",ps.whip],["IP",ps.inningsPitched],["SO",ps.strikeOuts],["BB",ps.baseOnBalls],["HR",ps.homeRuns],["W",ps.wins],["L",ps.losses],["SV",ps.saves]].map(x=>stat(...x)).join("");
  const psplit=people.stats?.slice(0,8)||[];
  $("players").innerHTML=psplit.map(x=>`<div class="player"><b>${x.player.fullName}</b><div class="line">AVG ${x.stat.avg||"—"} • OPS ${x.stat.ops||"—"} • HR ${x.stat.homeRuns??"—"} • RBI ${x.stat.rbi??"—"}</div></div>`).join("");
  $("updated").textContent=new Date().toLocaleString();
 }catch(e){console.error(e);$("updated").textContent="MLB data could not be loaded. Refresh and try again."}
}
$("refresh").onclick=load;load();