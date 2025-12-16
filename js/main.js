let stress=0,fatigue=0,errors=0,score=0;
setInterval(()=>{
  fatigue+=0.2; stress+=fatigue>60?0.5:0.2;
  document.getElementById('stress')?.innerText=Math.floor(stress)+'%';
  document.getElementById('fatigue')?.innerText=Math.floor(fatigue)+'%';
},1000);
document.getElementById('dispatchBtn')?.addEventListener('click',()=>{
  if(Math.random()<stress/120){errors++;stress+=8;}
  else score+=100;
  document.getElementById('errors').innerText=errors;
  document.getElementById('score').innerText=score;
  if(stress>=100){alert('BURNOUT');location.href='index.html';}
});