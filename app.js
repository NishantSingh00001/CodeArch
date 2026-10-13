/* CodeArchaeologist — shared client helpers (GitHub API + AI backend) */
(function(global){
  var GH = "https://api.github.com";

  function token(){ try{return localStorage.getItem("ca_ghtoken")||"";}catch(e){return "";} }
  function setToken(t){ try{t?localStorage.setItem("ca_ghtoken",t):localStorage.removeItem("ca_ghtoken");}catch(e){} }
  function lastRepo(){ try{return localStorage.getItem("ca_repo")||"";}catch(e){return "";} }
  function setRepo(r){ try{localStorage.setItem("ca_repo",r);}catch(e){} }

  function parseRepo(input){
    if(!input) return null;
    input = input.trim().replace(/^https?:\/\/github\.com\//i,"").replace(/\.git$/,"").replace(/\/+$/,"");
    var m = input.match(/^([\w.-]+)\/([\w.-]+)/);
    return m ? {owner:m[1], repo:m[2]} : null;
  }

  async function gh(path){
    var headers = {"Accept":"application/vnd.github+json"};
    var t = token(); if(t) headers["Authorization"] = "Bearer " + t;
    var res = await fetch(GH + path, {headers:headers});
    if(res.status === 403){
      var rem = res.headers.get("X-RateLimit-Remaining");
      if(rem === "0") throw new Error("GitHub rate limit reached. Add a token (Settings) for higher limits, or wait a bit.");
    }
    if(res.status === 404) throw new Error("Repo or path not found. Check the name and that it's public.");
    if(!res.ok) throw new Error("GitHub error ("+res.status+").");
    return res.json();
  }

  var api = {
    token:token, setToken:setToken, lastRepo:lastRepo, setRepo:setRepo, parseRepo:parseRepo, gh:gh,

    repoInfo: function(o,r){ return gh("/repos/"+o+"/"+r); },
    commits: function(o,r,opts){ opts=opts||{}; var q="?per_page="+(opts.per_page||30);
      if(opts.path) q+="&path="+encodeURIComponent(opts.path);
      if(opts.page) q+="&page="+opts.page;
      return gh("/repos/"+o+"/"+r+"/commits"+q); },
    commit: function(o,r,sha){ return gh("/repos/"+o+"/"+r+"/commits/"+sha); },
    contributors: function(o,r){ return gh("/repos/"+o+"/"+r+"/contributors?per_page=30"); },
    tree: function(o,r,branch){ return gh("/repos/"+o+"/"+r+"/git/trees/"+(branch||"HEAD")+"?recursive=1"); },
    searchIssues: function(o,r,extra){ return gh("/search/issues?q="+encodeURIComponent("repo:"+o+"/"+r+" "+(extra||""))+"&per_page=20"); },
    rawFile: async function(o,r,branch,path){
      var url = "https://raw.githubusercontent.com/"+o+"/"+r+"/"+branch+"/"+path;
      var res = await fetch(url); if(!res.ok) throw new Error("Couldn't fetch "+path); return res.text();
    },

    /* AI backend */
    ai: async function(mode, payload){
      var res = await fetch("/api/ask", {method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(Object.assign({mode:mode}, payload||{}))});
      var j = await res.json();
      if(!res.ok || j.error) throw new Error(j.error || "The reasoning service returned an error.");
      return j;
    }
  };

  /* tiny helpers */
  global.$ = function(id){return document.getElementById(id);};
  global.esc = function(s){return String(s==null?"":s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});};
  global.fmtDate = function(d){ try{return new Date(d).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}catch(e){return "";} };
  global.CA = api;
})(window);
