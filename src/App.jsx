import { useState, useEffect, useCallback } from "react";

const FORM_ID = "261613290999872";
const API_KEY = "c420ad0e80347ee226a9dc2fcd1a0ca5";

async function fetchSubmissions() {
  const res = await fetch(
    `https://api.jotform.com/form/${FORM_ID}/submissions?apiKey=${API_KEY}&limit=1000&orderby=created_at`,
    { headers: { "Content-Type": "application/json" } }
  );
  if (!res.ok) throw new Error(`Jotform error: ${res.status}`);
  const json = await res.json();
  if (json.responseCode !== 200) throw new Error(json.message || "Jotform error");

  return json.content.map(sub => {
    const a = sub.answers || {};
    const get = (...labels) => {
      for (const label of labels) {
        const match = Object.values(a).find(f =>
          (f.text || "").toLowerCase().includes(label.toLowerCase())
        );
        if (match) return match.answer ?? null;
      }
      return null;
    };

    const rawDate = get("Event Date");
    let eventDate = null;
    if (rawDate && typeof rawDate === "object") {
      const { year, month, day } = rawDate;
      if (year) eventDate = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    } else if (typeof rawDate === "string") {
      eventDate = rawDate;
    }

    return {
      submissionId: sub.id,
      submittedAt: sub.created_at,
      centre:              get("Centre", "Location"),
      eventType:           get("Event Type"),
      eventDate,
      totalAttendance:     get("Total Attendance"),
      bloodUnits:          get("Units of Blood"),
      bloodLitres:         get("Litres of Blood"),
      donors:              get("Number of Donors"),
      treesPlanted:        get("Trees Planted"),
      volunteerHours:      get("Volunteer Hours"),
      blanketsCollected:   get("Blankets Collected"),
      blanketsDistributed: get("Blankets Distributed"),
      toysCollected:       get("Toys Collected"),
      toysDistributed:     get("Toys Distributed"),
      foodKg:              get("Food Collected"),
      mealsProvided:       get("Meals Provided"),
      foodPackages:        get("Food Packages"),
      otherOutcomeDesc:    get("Other Charity"),
      otherOutcomeQty:     get("Quantity"),
      submitterName:       get("Full Name"),
    };
  });
}

const fmt = v => parseFloat(v) || 0;
function sumField(rows, key) { return rows.reduce((a, r) => a + fmt(r[key]), 0); }
function groupBy(rows, key) {
  return rows.reduce((acc, r) => {
    const k = r[key] || "Unknown";
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows)
    lines.push(headers.map(h => `"${(r[h] ?? "").toString().replace(/"/g, '""')}"`).join(","));
  return lines.join("\n");
}
function downloadCSV(rows, filename) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Card({ label, value, unit, color }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"#888", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:800, color:"#1a1a2e" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span style={{ fontSize:14, fontWeight:500, color:"#aaa", marginLeft:4 }}>{unit}</span>}
      </div>
    </div>
  );
}

function BarChart({ data, color, valueLabel }) {
  if (!data.length) return <div style={{ color:"#bbb", fontSize:13, padding:20 }}>No data yet.</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <tbody>
          {data.map(({ label, value }) => (
            <tr key={label} style={{ borderBottom:"1px solid #f0f0f0" }}>
              <td style={{ padding:"8px 10px 8px 0", fontSize:13, color:"#444", whiteSpace:"nowrap", width:1 }}>{label}</td>
              <td style={{ padding:"8px 0", width:"100%" }}>
                <div style={{ background:"#f5f5f5", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:22, borderRadius:4, width:`${Math.max((value/max)*100,2)}%`, background:color, transition:"width 0.6s ease" }} />
                </div>
              </td>
              <td style={{ padding:"8px 0 8px 10px", fontSize:13, fontWeight:700, color:"#222", whiteSpace:"nowrap", width:1 }}>
                {value.toLocaleString()} {valueLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ACCENT="#E84C3D", BLUE="#3B82F6", GREEN="#10B981", PURPLE="#8B5CF6", ORANGE="#F59E0B";
const METRIC_GROUPS = [
  { label:"Blood Units",          key:"bloodUnits",           unit:"units", color:ACCENT },
  { label:"Blood Litres",         key:"bloodLitres",          unit:"L",     color:ACCENT },
  { label:"Donors",               key:"donors",               unit:"",      color:"#F43F5E" },
  { label:"Trees Planted",        key:"treesPlanted",         unit:"",      color:GREEN },
  { label:"Volunteer Hours",      key:"volunteerHours",       unit:"hrs",   color:BLUE },
  { label:"Blankets Collected",   key:"blanketsCollected",    unit:"",      color:PURPLE },
  { label:"Blankets Distributed", key:"blanketsDistributed",  unit:"",      color:PURPLE },
  { label:"Toys Collected",       key:"toysCollected",        unit:"",      color:ORANGE },
  { label:"Toys Distributed",     key:"toysDistributed",      unit:"",      color:ORANGE },
  { label:"Food Collected",       key:"foodKg",               unit:"kg",    color:GREEN },
  { label:"Meals Provided",       key:"mealsProvided",        unit:"",      color:GREEN },
  { label:"Food Packages",        key:"foodPackages",         unit:"",      color:GREEN },
  { label:"Total Attendance",     key:"totalAttendance",      unit:"",      color:BLUE },
];

export default function Dashboard() {
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filterCentre, setFilterCentre]     = useState("All");
  const [filterType, setFilterType]         = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]     = useState("");
  const [activeTab, setActiveTab]     = useState("overview");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchSubmissions();
      setRows(data); setLastRefresh(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (filterCentre !== "All" && r.centre !== filterCentre) return false;
    if (filterType   !== "All" && r.eventType !== filterType) return false;
    if (filterDateFrom && r.eventDate < filterDateFrom) return false;
    if (filterDateTo   && r.eventDate > filterDateTo)   return false;
    return true;
  });

  const centres  = ["All", ...Array.from(new Set(rows.map(r=>r.centre).filter(Boolean))).sort()];
  const types    = ["All", ...Array.from(new Set(rows.map(r=>r.eventType).filter(Boolean))).sort()];
  const byCentre = Object.entries(groupBy(filtered,"centre")).map(([label,rs])=>({ label, value:sumField(rs,"totalAttendance") })).sort((a,b)=>b.value-a.value);
  const byMonth  = Object.entries(filtered.reduce((acc,r)=>{ const m=(r.eventDate||"").slice(0,7)||"Unknown"; acc[m]=(acc[m]||0)+fmt(r.totalAttendance); return acc; },{})).map(([label,value])=>({ label,value })).sort((a,b)=>a.label.localeCompare(b.label));
  const byType   = Object.entries(groupBy(filtered,"eventType")).map(([label,rs])=>({ label, value:rs.length })).sort((a,b)=>b.value-a.value);

  const tabStyle = t => ({ padding:"8px 18px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, background:activeTab===t?ACCENT:"transparent", color:activeTab===t?"#fff":"#555", border:"none", transition:"all 0.2s" });
  const sel = { padding:"7px 10px", borderRadius:8, border:"1px solid #e0e0e0", fontSize:13, background:"#fff", color:"#333", cursor:"pointer" };

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#f7f8fa", minHeight:"100vh", paddingBottom:40 }}>
      <div style={{ background:"#1a1a2e", color:"#fff", padding:"22px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:11, letterSpacing:2, color:ACCENT, textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>BAPS Swaminarayan</div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5 }}>Charity Events Dashboard</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {lastRefresh && <span style={{ fontSize:11, color:"#aaa" }}>Updated {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:ACCENT, color:"#fff", fontSize:13, fontWeight:600, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      <div style={{ padding:"24px 32px" }}>
        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 16px", color:"#b91c1c", marginBottom:20, fontSize:13 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ background:"#fff", borderRadius:12, padding:"16px 20px", marginBottom:24, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
          <span style={{ fontSize:13, fontWeight:600, color:"#555" }}>Filter:</span>
          <select style={sel} value={filterCentre} onChange={e=>setFilterCentre(e.target.value)}>{centres.map(c=><option key={c}>{c}</option>)}</select>
          <select style={sel} value={filterType}   onChange={e=>setFilterType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>
          <input type="date" style={sel} value={filterDateFrom} onChange={e=>setFilterDateFrom(e.target.value)} />
          <input type="date" style={sel} value={filterDateTo}   onChange={e=>setFilterDateTo(e.target.value)} />
          {(filterCentre!=="All"||filterType!=="All"||filterDateFrom||filterDateTo) && (
            <button onClick={()=>{setFilterCentre("All");setFilterType("All");setFilterDateFrom("");setFilterDateTo("");}} style={{ ...sel, color:ACCENT, fontWeight:600 }}>Clear</button>
          )}
          <span style={{ marginLeft:"auto", fontSize:13, color:"#888" }}>{filtered.length} of {rows.length} submission{rows.length!==1?"s":""}</span>
        </div>

        <div style={{ display:"flex", gap:4, marginBottom:24, background:"#fff", borderRadius:10, padding:4, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", width:"fit-content", flexWrap:"wrap" }}>
          {[["overview","Overview"],["bycentre","By Centre"],["bydate","By Date"],["bytype","By Event Type"],["submissions","All Submissions"]].map(([t,l])=>(
            <button key={t} style={tabStyle(t)} onClick={()=>setActiveTab(t)}>{l}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign:"center", padding:60, color:"#aaa", fontSize:14 }}>Loading submissions…</div>}

        {!loading && rows.length===0 && !error && (
          <div style={{ background:"#fff", borderRadius:12, padding:48, textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:16, fontWeight:600, color:"#ccc" }}>No submissions yet</div>
            <div style={{ fontSize:13, marginTop:6, color:"#bbb" }}>Data will appear here as people complete the form.</div>
          </div>
        )}

        {!loading && rows.length>0 && <>
          {activeTab==="overview" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14 }}>
              <Card label="Total Events" value={filtered.length} color={BLUE} />
              {METRIC_GROUPS.map(m=><Card key={m.key} label={m.label} value={sumField(filtered,m.key)} unit={m.unit} color={m.color} />)}
            </div>
          )}

          {activeTab==="bycentre" && (
            <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>Attendance by Centre</h2>
                <button onClick={()=>downloadCSV(Object.entries(groupBy(filtered,"centre")).map(([centre,rs])=>{ const row={centre}; METRIC_GROUPS.forEach(m=>{row[m.label]=sumField(rs,m.key);}); return row; }),"baps-by-centre.csv")} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${ACCENT}`, background:"#fff", color:ACCENT, fontWeight:600, fontSize:12, cursor:"pointer" }}>Export CSV</button>
              </div>
              <BarChart data={byCentre} color={BLUE} valueLabel="attendees" />
              <div style={{ marginTop:28, overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:"#f7f8fa" }}>
                    <th style={{ padding:"8px 10px", textAlign:"left", color:"#888", fontWeight:700 }}>Centre</th>
                    <th style={{ padding:"8px 10px", textAlign:"left", color:"#888", fontWeight:700 }}>Events</th>
                    {METRIC_GROUPS.map(m=><th key={m.key} style={{ padding:"8px 10px", textAlign:"right", color:"#888", fontWeight:700, whiteSpace:"nowrap" }}>{m.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {Object.entries(groupBy(filtered,"centre")).sort((a,b)=>a[0].localeCompare(b[0])).map(([centre,rs])=>(
                      <tr key={centre} style={{ borderBottom:"1px solid #f0f0f0" }}>
                        <td style={{ padding:"8px 10px", fontWeight:600, color:"#222" }}>{centre}</td>
                        <td style={{ padding:"8px 10px", color:"#555" }}>{rs.length}</td>
                        {METRIC_GROUPS.map(m=><td key={m.key} style={{ padding:"8px 10px", textAlign:"right", color:"#444" }}>{sumField(rs,m.key).toLocaleString()}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab==="bydate" && (
            <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>Attendance by Month</h2>
                <button onClick={()=>downloadCSV(byMonth,"baps-by-month.csv")} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${ACCENT}`, background:"#fff", color:ACCENT, fontWeight:600, fontSize:12, cursor:"pointer" }}>Export CSV</button>
              </div>
              <BarChart data={byMonth} color={GREEN} valueLabel="attendees" />
              <div style={{ marginTop:28, overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:"#f7f8fa" }}>
                    {["Date","Centre","Event Type","Attendance","Blood Units","Volunteer Hours","Trees","Meals"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#888", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[...filtered].sort((a,b)=>(a.eventDate||"").localeCompare(b.eventDate||"")).map((r,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f0f0f0" }}>
                        <td style={{ padding:"8px 10px", color:"#555", whiteSpace:"nowrap" }}>{r.eventDate||"-"}</td>
                        <td style={{ padding:"8px 10px", fontWeight:600, color:"#222" }}>{r.centre||"-"}</td>
                        <td style={{ padding:"8px 10px", color:"#555" }}>{r.eventType||"-"}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.totalAttendance).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.bloodUnits).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.volunteerHours).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.treesPlanted).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.mealsProvided).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab==="bytype" && (
            <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>Events by Type</h2>
                <button onClick={()=>downloadCSV(Object.entries(groupBy(filtered,"eventType")).map(([type,rs])=>{ const row={eventType:type,count:rs.length}; METRIC_GROUPS.forEach(m=>{row[m.label]=sumField(rs,m.key);}); return row; }),"baps-by-type.csv")} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${ACCENT}`, background:"#fff", color:ACCENT, fontWeight:600, fontSize:12, cursor:"pointer" }}>Export CSV</button>
              </div>
              <BarChart data={byType} color={PURPLE} valueLabel="events" />
            </div>
          )}

          {activeTab==="submissions" && (
            <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>All Submissions ({filtered.length})</h2>
                <button onClick={()=>downloadCSV(filtered,"baps-all-submissions.csv")} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${ACCENT}`, background:"#fff", color:ACCENT, fontWeight:600, fontSize:12, cursor:"pointer" }}>Export CSV</button>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ background:"#f7f8fa" }}>
                    {["Submitted","Centre","Event Type","Date","Attendance","Blood Units","Donors","Trees","Vol. Hours","Blankets","Toys","Food (kg)","Meals","Submitter"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#888", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filtered.map((r,i)=>(
                      <tr key={i} style={{ borderBottom:"1px solid #f0f0f0" }}>
                        <td style={{ padding:"8px 10px", color:"#888", whiteSpace:"nowrap" }}>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "-"}</td>
                        <td style={{ padding:"8px 10px", fontWeight:600, color:"#222", whiteSpace:"nowrap" }}>{r.centre||"-"}</td>
                        <td style={{ padding:"8px 10px", color:"#555" }}>{r.eventType||"-"}</td>
                        <td style={{ padding:"8px 10px", color:"#555", whiteSpace:"nowrap" }}>{r.eventDate||"-"}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.totalAttendance).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.bloodUnits).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.donors).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.treesPlanted).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.volunteerHours).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.blanketsDistributed).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.toysDistributed).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.foodKg).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px" }}>{fmt(r.mealsProvided).toLocaleString()}</td>
                        <td style={{ padding:"8px 10px", color:"#555", whiteSpace:"nowrap" }}>{r.submitterName||"-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginTop:20, display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>downloadCSV(filtered,"baps-report.csv")} style={{ padding:"9px 20px", borderRadius:8, background:"#1a1a2e", color:"#fff", border:"none", fontWeight:600, fontSize:13, cursor:"pointer" }}>↓ Export Full Report (CSV)</button>
          </div>
        </>}
      </div>
    </div>
  );
}
