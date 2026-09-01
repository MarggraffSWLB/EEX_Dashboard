async function loadData(){
  const status=document.getElementById("status");
  try{
    const response=await fetch("data.json?ts="+Date.now(),{cache:"no-store"});
    if(!response.ok) throw new Error("data.json konnte nicht geladen werden (HTTP "+response.status+")");
    const json=await response.json();
    if(!Array.isArray(json.unix_seconds)||!Array.isArray(json.price)) throw new Error("Unerwartetes Datenformat.");
    const points=json.unix_seconds.map((ts,i)=>({ts:Number(ts),price:json.price[i]}))
      .filter(p=>Number.isFinite(p.ts)&&Number.isFinite(p.price));
    if(!points.length) throw new Error("Keine Preisdaten vorhanden.");
    const labels=points.map(p=>new Date(p.ts*1000).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}));
    const prices=points.map(p=>p.price);
    const avg=prices.reduce((a,b)=>a+b,0)/prices.length;
    document.getElementById("avg").textContent=avg.toFixed(1)+" €/MWh";
    document.getElementById("min").textContent=Math.min(...prices).toFixed(1)+" €/MWh";
    document.getElementById("max").textContent=Math.max(...prices).toFixed(1)+" €/MWh";
    document.getElementById("latest").textContent=points.at(-1).price.toFixed(1)+" €/MWh";
    status.textContent=json.generated_at?"Datenstand: "+new Date(json.generated_at).toLocaleString("de-DE"):"Daten erfolgreich geladen";
    new Chart(document.getElementById("priceChart"),{
      type:"line",data:{labels,datasets:[{label:"Day-Ahead Preis",data:prices,borderWidth:1.5,pointRadius:0,tension:.08,fill:false}]},
      options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y.toFixed(1)+" €/MWh"}}},
        scales:{x:{ticks:{maxTicksLimit:18},title:{display:true,text:"Datum"}},y:{title:{display:true,text:"€/MWh"}}}}
    });
  }catch(error){
    console.error(error); status.textContent="Fehler beim Laden der Daten";
    document.querySelector(".chart-wrap").innerHTML='<div class="error">Fehler: '+error.message+'</div>';
  }
}
loadData();
