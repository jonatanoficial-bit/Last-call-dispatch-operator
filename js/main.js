const body=document.body;
if(body.classList.contains('cover-screen')){
 body.addEventListener('pointerdown',()=>location.href='menu.html');
}
if(document.getElementById('start')){
 document.getElementById('start').onclick=()=>{
  const career=document.getElementById('career').value;
  const city=document.getElementById('city').value;
  localStorage.setItem('lc_save',JSON.stringify({career,city,score:0}));
  location.href='game.html';
 };
}
if(document.getElementById('ranking')){
 const r=JSON.parse(localStorage.getItem('lc_rank')||'[]');
 document.getElementById('ranking').innerHTML=r.map(x=>'<div>'+x.score+'</div>').join('');
}
