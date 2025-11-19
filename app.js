// ------------------ LÉXICO ------------------
const TOKEN_SPECS = [
  ['NUMBER', /^\d+/],
  ['ASSIGN', /^<-+/],
  ['ID', /^[a-zA-Z_][a-zA-Z0-9_]*/],
  ['OP', /^[+\-*/]/],
  ['LPAREN', /^\(/],
  ['RPAREN', /^\)/],
  ['NEWLINE', /^\n+/],
  ['SKIP', /^[ \t]+/]
];

function lexer(code){
  let pos = 0;
  const tokens = [];

  while(pos < code.length){
    let match = null;

    for(const [type, regex] of TOKEN_SPECS){
      const m = regex.exec(code.slice(pos));
      if(m){
        match = m[0];
        if(type !== "SKIP")
          tokens.push({type, value: match, start: pos, end: pos + match.length});
        pos += match.length;
        break;
      }
    }

    if(!match){
      tokens.push({type:"ERROR", value:code[pos], start:pos, end:pos+1});
      pos++;
    }
  }

  return tokens;
}

// ------------------ PARSER ------------------
function Parser(tokens){
  this.tokens = tokens.filter(t=>t.type!=="NEWLINE");
  this.pos = 0;
}

Parser.prototype.current = function(){ return this.tokens[this.pos] || null; }
Parser.prototype.match = function(type){
  const t = this.current();
  if(t && t.type === type){ this.pos++; return t; }
  return null;
}

Parser.prototype.expect = function(type){
  const r = this.match(type);
  if(!r) throw {message:`Se esperaba ${type}`, pos:this.current()?.start || 0};
}

Parser.prototype.parse = function(){
  if(this.tokens.length === 0) return;

  const id = this.match("ID");
  if(!id) throw {message:"Debe iniciar con un identificador", pos:0};

  this.expect("ASSIGN");
  this.expr();

  if(this.current())
    throw {message:"Tokens extra después de la expresión", pos:this.current().start};
}

Parser.prototype.expr = function(){
  this.term();
  while(this.current() && this.current().type==="OP"){
    this.match("OP");
    this.term();
  }
}

Parser.prototype.term = function(){
  const t = this.current();
  if(!t) throw {message:"Expresión incompleta", pos:0};

  if(t.type==="NUMBER" || t.type==="ID"){ this.match(t.type); return; }
  if(t.type==="LPAREN"){
    this.match("LPAREN");
    this.expr();
    this.expect("RPAREN");
    return;
  }

  throw {message:"Error en expresión", pos:t.start};
}

// ------------------ IA SENCILLA ------------------
function sugerenciasIA(code){
  const s = [];

  if(!code.includes("<-"))
    s.push("Usa '<-' para asignaciones.");

  if(code.includes("="))
    s.push("Detectada asignación con '=', revisa si debería ser '<-'.");

  if(s.length === 0)
    s.push("Sin sugerencias. Código claro.");

  return s;
}

// ------------------ UI ------------------
const editor = document.getElementById("editor");
const suggestionsEl = document.getElementById("suggestions");
const tokensEl = document.getElementById("tokens");
const resultEl = document.getElementById("result");
const tradEl = document.getElementById("trad");
const iaEl = document.getElementById("ia");
const reportEl = document.getElementById("report");

function getCode(){
  return editor.textContent.replace(/\u00A0/g," ");
}

function renderTokens(tokens){
  tokensEl.innerHTML = "";
  tokens.forEach(t=>{
    const el = document.createElement("div");
    el.className = "token";
    if(t.type==="ERROR") el.classList.add("error");
    el.textContent = `${t.type}:${t.value}`;
    tokensEl.appendChild(el);
  });
}

function renderSuggestions(list){
  suggestionsEl.innerHTML = "";
  list.forEach(s=>{
    const el = document.createElement("div");
    el.className = "suggest";
    el.textContent = s;
    suggestionsEl.appendChild(el);
  });
}

function analyze(){
  const code = getCode();
  const tokens = lexer(code);
  renderTokens(tokens);

  const ia = sugerenciasIA(code);
  renderSuggestions(ia);

  let parserResult = "";
  try{
    new Parser(tokens).parse();
    parserResult = "Sin errores sintácticos.";
  }catch(e){
    parserResult = e.message;
  }

  tradEl.textContent = parserResult;
  iaEl.textContent = ia.join("\n");

  resultEl.textContent = parserResult;

  const report = {
    ok: parserResult === "Sin errores sintácticos.",
    tokens,
    ia
  };
  reportEl.textContent = JSON.stringify(report, null, 2);

  window._lastReport = report;
}

// Botones
document.getElementById("runBtn").onclick = analyze;
document.getElementById("clearBtn").onclick = ()=>editor.textContent="";
document.getElementById("sampleBtn").onclick = ()=>{
  editor.textContent = "a <- 4\nb <- a * 3\nresultado <- b + 2";
};

// Descargar reporte
document.getElementById("downloadBtn").onclick = ()=>{
  const blob = new Blob([JSON.stringify(window._lastReport, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte.json";
  a.click();
  URL.revokeObjectURL(url);
};
