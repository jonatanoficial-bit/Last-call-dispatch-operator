
(function(){
const page=document.body.dataset.page;
if(page==="cover"){
document.getElementById("cover").addEventListener("click",()=>location.href="menu.html");
}
if(page==="menu"){
document.getElementById("startBtn").onclick=()=>location.href="game.html";
}
})();