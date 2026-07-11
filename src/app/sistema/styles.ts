/**
 * CSS do /sistema — inline via <style> na page pra ficar isolado do resto do
 * app (classes prefixadas `sys-`, zero colisão com globals.css / .admin-shell).
 * Padrão visual espelha o admin do AgendaPRO: claro, azul #2563EB, fundo
 * azul-acinzentado com orbs + grid sutil, cards brancos, texto slate.
 */
export const SISTEMA_CSS = `
.sys-root {
  --sys-bg:#E6EBF3; --sys-bg-deep:#D8DFEA;
  --sys-surface:#FFFFFF; --sys-surface-hover:#F1F5F9;
  --sys-border:#E2E8F0; --sys-border-hi:#CBD5E1;
  --sys-text:#0F172A; --sys-text-2:#334155; --sys-text-mute:#64748B; --sys-text-faded:#94A3B8;
  --sys-accent:#2563EB; --sys-accent-2:#3B82F6; --sys-accent-bg:rgba(37,99,235,.08); --sys-accent-border:rgba(37,99,235,.22);
  --sys-success:#059669; --sys-success-bg:rgba(5,150,105,.10);
  --sys-warn:#D97706; --sys-warn-bg:rgba(217,119,6,.10);
  --sys-danger:#DC2626; --sys-danger-bg:rgba(220,38,38,.10);
  --sys-wa:#16A34A;
  --sys-shadow:0 10px 40px rgba(15,23,42,0.08);
  --sys-shadow-sm:0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.05);
  --sys-r:15px;
  position:relative; min-height:100vh; color:var(--sys-text);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased;
  background:
    radial-gradient(circle at 12% 100%, rgba(37,99,235,.11) 0%, transparent 46%),
    radial-gradient(circle at 88% 8%, rgba(6,182,212,.09) 0%, transparent 52%),
    radial-gradient(circle at 92% 96%, rgba(139,92,246,.06) 0%, transparent 46%),
    linear-gradient(165deg, #ECF0F6 0%, var(--sys-bg) 46%, var(--sys-bg-deep) 100%);
  background-attachment:fixed;
}
.sys-root::before {
  content:""; position:fixed; inset:0; z-index:0; pointer-events:none;
  background-image:
    linear-gradient(to right, rgba(15,23,42,.028) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15,23,42,.028) 1px, transparent 1px);
  background-size:42px 42px;
  -webkit-mask-image:radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 85%);
  mask-image:radial-gradient(ellipse 90% 70% at 50% 0%, #000 30%, transparent 85%);
}
.sys-mono { font-variant-numeric:tabular-nums; font-feature-settings:"tnum"; }
.sys-wrap { position:relative; z-index:1; max-width:1140px; margin:0 auto; padding:26px 26px 64px; }
.sys-spacer { flex:1; }

.sys-topbar { display:flex; align-items:center; gap:14px; padding-bottom:22px; flex-wrap:wrap; }
.sys-brand { display:flex; align-items:center; gap:12px; }
.sys-brand h1 { font-size:16px; margin:0; font-weight:680; letter-spacing:-.2px; }
.sys-logo { width:38px; height:38px; border-radius:11px;
  background:linear-gradient(145deg,var(--sys-accent-2),var(--sys-accent)); color:#fff;
  display:grid; place-items:center; font-weight:800; font-size:17px; letter-spacing:-.5px;
  box-shadow:0 6px 16px -4px rgba(37,99,235,.5); }
.sys-path { font-size:12px; color:var(--sys-text-mute); margin-top:1px; }
.sys-path b { color:var(--sys-accent); font-weight:650; }
.sys-who { font-size:12.5px; color:var(--sys-text-2); display:flex; align-items:center; gap:8px;
  background:rgba(255,255,255,.6); border:1px solid var(--sys-border); border-radius:20px; padding:6px 13px; }
.sys-who b { font-weight:620; color:var(--sys-text); }
.sys-dot { width:7px; height:7px; border-radius:50%; background:var(--sys-success); box-shadow:0 0 0 3px var(--sys-success-bg); }

.sys-eyebrow { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--sys-text-faded); font-weight:680; }

.sys-kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:13px; }
.sys-kpi { background:var(--sys-surface); border:1px solid var(--sys-border); border-radius:var(--sys-r);
  padding:16px 17px 15px; box-shadow:var(--sys-shadow-sm); position:relative; overflow:hidden; transition:transform .16s, box-shadow .16s; }
.sys-kpi:hover { transform:translateY(-2px); box-shadow:var(--sys-shadow); }
.sys-ktop { display:flex; align-items:center; gap:8px; }
.sys-ic { width:26px; height:26px; border-radius:8px; display:grid; place-items:center; flex-shrink:0; }
.sys-ic svg { width:15px; height:15px; }
.sys-ic.blue { background:var(--sys-accent-bg); color:var(--sys-accent); }
.sys-ic.green { background:var(--sys-success-bg); color:var(--sys-success); }
.sys-ic.amber { background:var(--sys-warn-bg); color:var(--sys-warn); }
.sys-ic.red { background:var(--sys-danger-bg); color:var(--sys-danger); }
.sys-klabel { font-size:11.5px; color:var(--sys-text-mute); font-weight:580; }
.sys-num { font-size:31px; font-weight:720; letter-spacing:-1.2px; margin-top:11px; line-height:1; color:var(--sys-text); }
.sys-kpi.green .sys-num { color:var(--sys-success); }
.sys-kpi.amber .sys-num { color:var(--sys-warn); }
.sys-kpi.red .sys-num { color:var(--sys-danger); }
.sys-ksub { font-size:11.5px; color:var(--sys-text-mute); margin-top:8px; display:flex; align-items:center; gap:5px; }
.sys-delta { font-weight:700; display:inline-flex; align-items:center; gap:2px; }
.sys-delta.up { color:var(--sys-success); } .sys-delta.down { color:var(--sys-danger); }

.sys-card { background:var(--sys-surface); border:1px solid var(--sys-border); border-radius:var(--sys-r); box-shadow:var(--sys-shadow-sm); }

.sys-funnel { padding:18px 20px 20px; margin:15px 0; }
.sys-fhead { display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; gap:10px; flex-wrap:wrap; }
.sys-conv { font-size:12px; color:var(--sys-text-2); background:var(--sys-success-bg); padding:4px 11px; border-radius:20px; }
.sys-conv b { color:var(--sys-success); font-weight:750; }
.sys-fbar { display:flex; gap:5px; height:52px; }
.sys-seg { display:flex; flex-direction:column; justify-content:center; padding:0 14px; border-radius:10px; min-width:56px; }
.sys-segn { font-weight:760; font-size:17px; line-height:1; letter-spacing:-.5px; }
.sys-segt { font-size:10.5px; font-weight:600; margin-top:4px; white-space:nowrap; opacity:.92; }
.sys-seg.s1 { background:var(--sys-accent-bg); color:var(--sys-accent); box-shadow:inset 0 0 0 1px var(--sys-accent-border); }
.sys-seg.s2 { background:var(--sys-warn-bg); color:var(--sys-warn); box-shadow:inset 0 0 0 1px rgba(217,119,6,.22); }
.sys-seg.s3 { background:var(--sys-success-bg); color:var(--sys-success); box-shadow:inset 0 0 0 1px rgba(5,150,105,.22); }
.sys-seg.s4 { background:var(--sys-danger-bg); color:var(--sys-danger); box-shadow:inset 0 0 0 1px rgba(220,38,38,.22); }

.sys-grid2 { display:grid; grid-template-columns:1.12fr .88fr; gap:16px; align-items:start; }
.sys-listcard { overflow:hidden; transition:box-shadow .18s; }
.sys-listcard:hover { box-shadow:var(--sys-shadow); }
.sys-lchead { display:flex; align-items:center; gap:10px; padding:15px 17px 13px; }
.sys-lchead + .sys-lchead, .sys-row + .sys-lchead { border-top:1px solid var(--sys-border); }
.sys-ttl { font-size:14px; font-weight:680; letter-spacing:-.2px; }
.sys-desc { font-size:11.5px; color:var(--sys-text-faded); }
.sys-count { font-size:11px; font-weight:750; padding:2px 9px; border-radius:20px; }
.sys-count.amber { background:var(--sys-warn-bg); color:var(--sys-warn); }
.sys-count.red { background:var(--sys-danger-bg); color:var(--sys-danger); }
.sys-count.slate { background:rgba(100,116,139,.10); color:var(--sys-text-mute); }

.sys-row { display:flex; align-items:center; gap:12px; padding:13px 17px; border-top:1px solid var(--sys-border); transition:background .12s; }
.sys-row:hover { background:var(--sys-surface-hover); }
.sys-biz { min-width:0; flex:1; }
.sys-nm { font-size:13.5px; font-weight:620; display:flex; align-items:center; gap:8px; letter-spacing:-.1px; }
.sys-meta { font-size:11.5px; color:var(--sys-text-mute); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sys-meta .sys-mono { color:var(--sys-text-2); }
.sys-chip { font-size:9.5px; font-weight:720; padding:2px 7px; border-radius:6px; letter-spacing:.03em; text-transform:uppercase; }
.sys-chip.amber { background:var(--sys-warn-bg); color:var(--sys-warn); }
.sys-chip.red { background:var(--sys-danger-bg); color:var(--sys-danger); }
.sys-chip.ghost { background:rgba(100,116,139,.10); color:var(--sys-text-mute); text-transform:none; letter-spacing:0; font-weight:600; }

.sys-acts { display:flex; gap:8px; flex-shrink:0; align-items:center; }
.sys-btn { border:1px solid var(--sys-border-hi); background:var(--sys-surface); color:var(--sys-text-2); border-radius:9px;
  padding:7px 12px; font-size:12px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
  transition:all .13s; text-decoration:none; }
.sys-btn:hover { border-color:var(--sys-accent-border); color:var(--sys-accent); background:var(--sys-accent-bg); }
.sys-btn:focus-visible { outline:2px solid var(--sys-accent); outline-offset:2px; }
.sys-btn svg { width:14px; height:14px; }
.sys-btn.sys-wa { background:var(--sys-wa); border-color:var(--sys-wa); color:#fff; box-shadow:0 4px 12px -4px rgba(22,163,74,.5); }
.sys-btn.sys-wa:hover { filter:brightness(1.05); color:#fff; background:var(--sys-wa); }
.sys-btn.sys-guard { border-color:rgba(217,119,6,.4); color:var(--sys-warn); }
.sys-btn.sys-guard:hover { background:var(--sys-warn-bg); border-color:var(--sys-warn); color:var(--sys-warn); }
.sys-btn:disabled { opacity:.5; cursor:not-allowed; }
.sys-btn:disabled:hover { background:var(--sys-surface); border-color:rgba(217,119,6,.4); color:var(--sys-warn); }
.sys-nowa { font-size:11px; color:var(--sys-text-faded); }

.sys-empty { padding:22px 17px; text-align:center; font-size:12.5px; color:var(--sys-text-faded); border-top:1px solid var(--sys-border); }
.sys-note { font-size:11.5px; color:var(--sys-text-mute); padding:12px 17px; border-top:1px solid var(--sys-border); background:rgba(241,245,249,.5); }
.sys-note b { color:var(--sys-text-2); font-weight:650; }

.sys-footer { display:flex; align-items:center; gap:10px; font-size:11.5px; color:var(--sys-text-faded); margin:18px 4px 0; flex-wrap:wrap; }

@media (max-width:880px) {
  .sys-kpis { grid-template-columns:repeat(2,1fr); }
  .sys-grid2 { grid-template-columns:1fr; }
  .sys-segt { display:none; }
  .sys-row { flex-wrap:wrap; }
  .sys-acts { width:100%; }
}
`
