const url =
"https://api.energy-charts.info/price?bzn=DE-LU&year=2026";

async function loadData(){

const response = await fetch(url);

const json = await response.json();

const labels = json.unix_seconds.map(t=>{
return new Date(t*1000).toLocaleDateString("de-DE");
});

const prices = json.price;

const avg =
prices.reduce((a,b)=>a+b,0)/prices.length;

document.getElementById("avg").innerText =
avg.toFixed(1)+" €/MWh";

document.getElementById("max").innerText =
Math.max(...prices).toFixed(1);

document.getElementById("min").innerText =
Math.min(...prices).toFixed(1);

new Chart(priceChart,{
type:"line",
data:{
labels,
datasets:[{
data:prices,
borderWidth:2,
pointRadius:0,
tension:0.15
}]
},
options:{
responsive:true,
plugins:{
legend:{display:false}
},
scales:{
x:{
ticks:{display:false}
},
y:{
title:{
display:true,
text:"€/MWh"
}
}
}
}
});

}

loadData();
