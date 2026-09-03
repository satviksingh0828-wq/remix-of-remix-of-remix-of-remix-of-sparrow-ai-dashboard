import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { ChevronRight, Download, FileSpreadsheet, Plus, Search, Settings2, Trash2, Variable } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/lib/session";
import { useBranches } from "@/lib/use-branches";
import { supabase } from "@/integrations/supabase/client";
import { SYSTEM_VARIABLES, type ReportScope } from "@/lib/report-master/system-variables";

type VariableRow = { id:string; name:string; variable_key:string; system_value_key:string; description:string; data_type:string; default_aggregation:string; is_active:boolean };
type TemplateColumn = { id:string; heading:string; variableId?:string; formula?:string; format:string };
type TemplateRow = { id:string; name:string; description:string; report_scope:ReportScope; columns:TemplateColumn[]; version:number; is_active:boolean };
type DataRow = Record<string, unknown>;
const scopeLabels: Record<ReportScope,string> = { open_trip:"Open Trip Wise", closed_trip:"Closed Trip Wise", all_trip:"All Trips", manifest:"Manifest Wise", branch:"Branch Wise" };
const tabs = [{id:"variables",label:"Report Variables",icon:Variable},{id:"templates",label:"Report Templates",icon:Settings2},{id:"reports",label:"Reports",icon:FileSpreadsheet}] as const;
type Tab = typeof tabs[number]["id"];
const num = (x:unknown) => Number(String(x ?? "").replace(/,/g,"")) || 0;
const safeKey = (s:string) => s.trim().toLowerCase().replace(/[^a-z0-9_]+/g,"_").replace(/^_+|_+$/g,"");

function readPath(obj:unknown, paths:string[]):unknown {
  for (const path of paths) {
    let value: unknown = obj;
    for (const part of path.split(".")) value = value && typeof value === "object" ? (value as DataRow)[part] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function resolveSystem(key:string,row:DataRow):unknown {
  const snap = row.snapshot as DataRow | undefined;
  const trip = (snap?.trip as DataRow) ?? snap ?? row;
  const date = String(row.closed_at ?? row.created_at ?? row.manifest_date ?? row.start_date ?? "");
  const direct:Record<string,unknown> = {
    "open.trip_code":row.trip_code,"open.status":"Open","open.ownership":row.ownership,"open.start_date":row.start_date,"open.end_date":row.end_date,
    "open.start_time":row.start_time,"open.end_time":row.end_time,"open.odometer_start":row.odometer_start,"open.odometer_end":row.odometer_end,"open.notes":row.notes,"open.created_at":row.created_at,"open.reopened_at":row.reopened_at,
    "closed.trip_code":row.trip_code,"closed.status":"Closed","closed.start_date":row.start_date,"closed.end_date":row.end_date,"closed.closed_at":row.closed_at,
    "closed.total_income":row.total_income,"closed.total_expense":row.total_expense,"closed.net_income":row.net_income,
    "closed.profit_margin":num(row.total_income) ? num(row.net_income)/num(row.total_income)*100 : 0,
    "trip.trip_code":row.trip_code,"trip.status":row.__status,"trip.branch_name":row.branch_name ?? readPath(trip,["branch_name","branch.branch_name"]),
    "trip.start_date":row.start_date ?? readPath(trip,["start_date"]),"trip.end_date":row.end_date ?? readPath(trip,["end_date"]),
    "trip.vehicle_number":readPath(trip,["vehicle.registration_number","vehicle_number","vehicle.registration_number"]),
    "trip.driver_name":readPath(trip,["driver.full_name","driver_name"]),"trip.transporter_name":readPath(trip,["transporter.transporter_name","transporter_name"]),
    "trip.contract_name":readPath(trip,["contract.contract_name","contract_name"]),"trip.start_location":readPath(trip,["start_location.location_name","start_location_name"]),"trip.end_location":readPath(trip,["end_location.location_name","end_location_name"]),
    "trip.manifest_count":row.__manifest_count ?? readPath(snap,["manifests.length"]),"trip.total_weight_kg":row.__weight,"trip.total_weight_tonnes":num(row.__weight)/1000,"trip.total_quantity":row.__quantity,
    "trip.total_freight":readPath(snap,["totals.freight","freight_total"]),"trip.total_loading":readPath(snap,["totals.loading","loading_total"]),"trip.total_other_income":row.__other_income,
    "trip.total_income":row.total_income,"trip.total_expense":row.total_expense ?? row.__expense,"trip.net_income":row.net_income ?? (num(row.total_income)-num(row.__expense)),
    "manifest.number":row.manifest_number,"manifest.date":row.manifest_date,"manifest.from_pin":row.from_pin_code,"manifest.to_pin":row.to_pin_code,
    "manifest.weight_kg":row.weight_kg,"manifest.weight_tonnes":num(row.weight_kg)/1000,"manifest.quantity":row.quantity,
    "manifest.from_location":row.from_location_name,"manifest.to_location":row.to_location_name,"manifest.freight":row.freight,"manifest.loading":row.loading,"manifest.total_income":num(row.freight)+num(row.loading),
    "period.month":date ? new Date(date).toLocaleString("en-IN",{month:"long"}) : "","period.year":date ? new Date(date).getFullYear() : "",
    "period.financial_year":date ? `FY ${new Date(date).getMonth()<3?new Date(date).getFullYear()-1:new Date(date).getFullYear()}-${String((new Date(date).getMonth()<3?new Date(date).getFullYear():new Date(date).getFullYear()+1)).slice(-2)}` : "",
    "summary.row_count":row.__row_count,"summary.trip_count":row.__trip_count,"summary.manifest_count":row.__manifest_count,
  };
  return direct[key] ?? readPath(snap,[key,key.replace(/^[^.]+\./,"")]);
}

function evalFormula(formula:string, values:Record<string,unknown>) {
  let expression=formula;
  Object.entries(values).sort((a,b)=>b[0].length-a[0].length).forEach(([key,value])=>{ expression=expression.replace(new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"g"),String(num(value))); });
  if (!/^[\d\s.+\-*/()%]+$/.test(expression)) return "Invalid formula";
  const tokens=expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g)??[]; let at=0;
  const primary=():number=>{const token=tokens[at++];if(token==="("){const value=add();if(tokens[at++]!==")")throw new Error();return value}if(token==="-")return-primary();const value=Number(token);if(!Number.isFinite(value))throw new Error();return value};
  const multiply=():number=>{let value=primary();while(["*","/","%"].includes(tokens[at])){const op=tokens[at++],right=primary();value=op==="*"?value*right:op==="/"?(right===0?0:value/right):(right===0?0:value%right)}return value};
  const add=():number=>{let value=multiply();while(["+","-"].includes(tokens[at])){const op=tokens[at++],right=multiply();value=op==="+"?value+right:value-right}return value};
  try {const result=add();return at===tokens.length&&Number.isFinite(result)?result:"Formula error"} catch { return "Formula error"; }
}

export function ReportMasterPage() {
  const {user}=useSession(); const branches=useBranches(); const canEdit=user?.role==="admin";
  const [tab,setTab]=useState<Tab>("variables"); const [variables,setVariables]=useState<VariableRow[]>([]); const [templates,setTemplates]=useState<TemplateRow[]>([]);
  const [loading,setLoading]=useState(false); const [search,setSearch]=useState("");
  const load=useCallback(async()=>{ const [v,t]=await Promise.all([supabase.from("report_variables" as never).select("*").order("created_at"),supabase.from("report_templates" as never).select("*").order("created_at")]); if(v.error||t.error) toast.error(v.error?.message||t.error?.message); else {setVariables((v.data??[]) as unknown as VariableRow[]);setTemplates((t.data??[]) as unknown as TemplateRow[]);} },[]);
  useEffect(()=>{void load()},[load]);
  return <AppShell breadcrumb={<span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Link to="/home">Workspace</Link><ChevronRight className="size-3.5"/><Link to="/tms">TMS</Link><ChevronRight className="size-3.5"/><span className="text-foreground">Report Master</span></span>}>
    <header><h1 className="text-2xl font-semibold">Report Master</h1><p className="mt-1 text-sm text-muted-foreground">Define searchable system variables, reusable report templates and Excel-ready reports.</p></header>
    <div className="mt-6 flex flex-wrap gap-2 border-b pb-3">{tabs.map(x=><Button key={x.id} variant={tab===x.id?"default":"outline"} onClick={()=>setTab(x.id)}><x.icon className="mr-2 size-4"/>{x.label}</Button>)}</div>
    <div className="mt-6">{tab==="variables"&&<VariablesPanel rows={variables} canEdit={canEdit} search={search} setSearch={setSearch} reload={load}/>} {tab==="templates"&&<TemplatesPanel rows={templates} variables={variables.filter(v=>v.is_active)} canEdit={canEdit} reload={load}/>} {tab==="reports"&&<ReportsPanel templates={templates.filter(t=>t.is_active)} variables={variables} branches={branches} loading={loading} setLoading={setLoading}/>}</div>
  </AppShell>;
}

function VariablesPanel({rows,canEdit,search,setSearch,reload}:{rows:VariableRow[];canEdit:boolean;search:string;setSearch:(x:string)=>void;reload:()=>Promise<void>}) {
  const [name,setName]=useState(""); const [key,setKey]=useState(""); const [system,setSystem]=useState(""); const [systemSearch,setSystemSearch]=useState("");
  const options=SYSTEM_VARIABLES.filter(x=>(x.label+" "+x.key+" "+x.group).toLowerCase().includes(systemSearch.toLowerCase()));
  const save=async()=>{const def=SYSTEM_VARIABLES.find(x=>x.key===system);if(!name||!def)return toast.error("Enter a name and select a system variable.");const {error}=await supabase.from("report_variables" as never).insert({name,variable_key:key||safeKey(name),system_value_key:def.key,description:def.description,data_type:def.type,default_aggregation:def.type==="currency"||def.type==="number"?"sum":"none"} as never);if(error)toast.error(error.message);else{toast.success("Report variable created");setName("");setKey("");setSystem("");await reload();}};
  const remove=async(id:string)=>{if(!confirm("Delete this report variable?"))return;const {error}=await supabase.from("report_variables" as never).delete().eq("id",id);if(error)toast.error(error.message);else await reload()};
  const filtered=rows.filter(x=>(x.name+x.variable_key+x.system_value_key).toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5">{canEdit&&<section className="surface-card p-5"><h2 className="font-semibold">Define a report variable</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Variable name"><Input value={name} onChange={e=>{setName(e.target.value);if(!key)setKey(safeKey(e.target.value))}} placeholder="Example: Trip Income"/></Field><Field label="Formula key"><Input value={key} onChange={e=>setKey(safeKey(e.target.value))} placeholder="trip_income"/></Field><Field label="Search all system variables"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={systemSearch} onChange={e=>setSystemSearch(e.target.value)} placeholder="Search trip, freight, weight, expense..."/></div></Field><Field label={`System variable (${options.length} found)`}><Select value={system} onValueChange={setSystem}><SelectTrigger><SelectValue placeholder="Select system value"/></SelectTrigger><SelectContent className="max-h-80">{options.map(x=><SelectItem key={x.key} value={x.key}>{x.group} · {x.label}</SelectItem>)}</SelectContent></Select></Field></div>{system&&<p className="mt-3 rounded-lg bg-muted p-3 text-xs"><b>{SYSTEM_VARIABLES.find(x=>x.key===system)?.label}</b> — {SYSTEM_VARIABLES.find(x=>x.key===system)?.description}</p>}<Button className="mt-4" onClick={save}><Plus className="mr-2 size-4"/>Add Variable</Button></section>}
    <section><div className="relative mb-3 max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search defined variables"/></div><div className="overflow-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Formula key</th><th className="p-3 text-left">System value</th><th className="p-3">Type</th>{canEdit&&<th/>}</tr></thead><tbody>{filtered.map(x=><tr key={x.id} className="border-t"><td className="p-3 font-medium">{x.name}</td><td className="p-3 font-mono text-xs">{x.variable_key}</td><td className="p-3">{SYSTEM_VARIABLES.find(v=>v.key===x.system_value_key)?.label??x.system_value_key}</td><td className="p-3 text-center">{x.data_type}</td>{canEdit&&<td className="p-3 text-right"><Button size="icon" variant="ghost" onClick={()=>remove(x.id)}><Trash2 className="size-4"/></Button></td>}</tr>)}{!filtered.length&&<tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No variables found.</td></tr>}</tbody></table></div></section></div>;
}

function TemplatesPanel({rows,variables,canEdit,reload}:{rows:TemplateRow[];variables:VariableRow[];canEdit:boolean;reload:()=>Promise<void>}) {
  const [name,setName]=useState("");const [description,setDescription]=useState("");const [scope,setScope]=useState<ReportScope>("closed_trip");const [columns,setColumns]=useState<TemplateColumn[]>([]);
  const compatible=variables.filter(v=>SYSTEM_VARIABLES.find(s=>s.key===v.system_value_key)?.scopes.includes(scope));
  const addColumn=()=>setColumns(c=>[...c,{id:crypto.randomUUID(),heading:"",variableId:compatible[0]?.id,format:"auto"}]);
  const save=async()=>{if(!name||!columns.length||columns.some(c=>!c.heading||(!c.variableId&&!c.formula)))return toast.error("Name the template and complete every column.");const {error}=await supabase.from("report_templates" as never).insert({name,description,report_scope:scope,columns} as never);if(error)toast.error(error.message);else{toast.success("Template created");setName("");setDescription("");setColumns([]);await reload();}};
  const remove=async(id:string)=>{if(!confirm("Delete this template?"))return;await supabase.from("report_templates" as never).delete().eq("id",id);await reload()};
  return <div className="space-y-5">{canEdit&&<section className="surface-card p-5"><h2 className="font-semibold">Create report template</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><Field label="Template name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Monthly Trip Profit"/></Field><Field label="Description"><Input value={description} onChange={e=>setDescription(e.target.value)}/></Field><Field label="Report type"><Select value={scope} onValueChange={x=>{setScope(x as ReportScope);setColumns([])}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(scopeLabels).map(([k,l])=><SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field></div><div className="mt-5 space-y-3">{columns.map((c,i)=><div key={c.id} className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"><Input value={c.heading} onChange={e=>setColumns(a=>a.map(x=>x.id===c.id?{...x,heading:e.target.value}:x))} placeholder={`Column ${i+1} heading`}/><Select value={c.variableId} onValueChange={x=>setColumns(a=>a.map(y=>y.id===c.id?{...y,variableId:x,formula:undefined}:y))}><SelectTrigger><SelectValue placeholder="Variable"/></SelectTrigger><SelectContent>{compatible.map(v=><SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent></Select><Input value={c.formula??""} onChange={e=>setColumns(a=>a.map(x=>x.id===c.id?{...x,formula:e.target.value||undefined,variableId:e.target.value?undefined:x.variableId}:x))} placeholder="Or formula: income-expense"/><Button variant="ghost" size="icon" onClick={()=>setColumns(a=>a.filter(x=>x.id!==c.id))}><Trash2 className="size-4"/></Button></div>)}</div><div className="mt-4 flex gap-2"><Button variant="outline" onClick={addColumn} disabled={!compatible.length}><Plus className="mr-2 size-4"/>Add Column</Button><Button onClick={save}>Save Template</Button></div><p className="mt-3 text-xs text-muted-foreground">Formula columns use your variable keys with +, −, ×, ÷ and parentheses. Example: <code>trip_income / trip_weight * 100</code>.</p></section>}
    <div className="grid gap-4 md:grid-cols-2">{rows.map(t=><article key={t.id} className="surface-card p-5"><div className="flex justify-between"><div><h3 className="font-semibold">{t.name}</h3><p className="text-xs text-muted-foreground">{scopeLabels[t.report_scope]} · Version {t.version}</p></div>{canEdit&&<Button size="icon" variant="ghost" onClick={()=>remove(t.id)}><Trash2 className="size-4"/></Button>}</div><p className="mt-2 text-sm text-muted-foreground">{t.description}</p><div className="mt-3 flex flex-wrap gap-1">{t.columns.map(c=><span key={c.id} className="rounded bg-muted px-2 py-1 text-xs">{c.heading}</span>)}</div></article>)}{!rows.length&&<p className="text-sm text-muted-foreground">No templates yet. Create variables first, then build a template.</p>}</div></div>;
}

function ReportsPanel({templates,variables,branches,loading,setLoading}:{templates:TemplateRow[];variables:VariableRow[];branches:{id:string;branch_name:string}[];loading:boolean;setLoading:(x:boolean)=>void}) {
  const [templateId,setTemplateId]=useState("");const [branch,setBranch]=useState("all");const now=new Date();const [month,setMonth]=useState(String(now.getMonth()+1));const [year,setYear]=useState(String(now.getFullYear()));const [rows,setRows]=useState<DataRow[]>([]);
  const template=templates.find(t=>t.id===templateId); const cols=template?.columns??[];
  const generate=async()=>{if(!template)return toast.error("Select a template.");setLoading(true);try{const start=`${year}-${month.padStart(2,"0")}-01`;const endDate=new Date(Number(year),Number(month),1);const end=endDate.toISOString().slice(0,10);let data:DataRow[]=[];
    if(template.report_scope==="closed_trip"||template.report_scope==="all_trip"||template.report_scope==="branch"){let q=supabase.from("closed_trips").select("*").gte("closed_at",start).lt("closed_at",end);if(branch!=="all")q=q.eq("branch_id",branch);const r=await q;if(r.error)throw r.error;data=(r.data??[]).map(x=>({...x,__status:"Closed"}));}
    if(template.report_scope==="open_trip"||template.report_scope==="all_trip"){let q=supabase.from("trips").select("*").gte("start_date",start).lt("start_date",end);if(branch!=="all")q=q.eq("branch_id",branch);const r=await q;if(r.error)throw r.error;data.push(...(r.data??[]).map(x=>({...x,__status:"Open",branch_name:branches.find(b=>b.id===x.branch_id)?.branch_name})));}
    if(template.report_scope==="manifest"){const trips=await supabase.from("trips").select("id,trip_code,branch_id");const allowed=(trips.data??[]).filter(t=>branch==="all"||t.branch_id===branch);const ids=allowed.map(t=>t.id);if(ids.length){const r=await supabase.from("trip_manifests").select("*").in("trip_id",ids).gte("manifest_date",start).lt("manifest_date",end);if(r.error)throw r.error;data=(r.data??[]).map(m=>({...m,trip_code:allowed.find(t=>t.id===m.trip_id)?.trip_code,__status:"Open"}));}}
    if(template.report_scope==="branch"){const grouped=new Map<string,DataRow>();data.forEach(r=>{const k=String(r.branch_id??"none");const g=grouped.get(k)??{branch_name:r.branch_name||"Unassigned",__row_count:0,__trip_count:0,__manifest_count:0,total_income:0,total_expense:0,net_income:0,__status:"Closed"};g.__row_count=num(g.__row_count)+1;g.__trip_count=num(g.__trip_count)+1;g.total_income=num(g.total_income)+num(r.total_income);g.total_expense=num(g.total_expense)+num(r.total_expense);g.net_income=num(g.net_income)+num(r.net_income);grouped.set(k,g)});data=[...grouped.values()];}
    setRows(data.map(raw=>{const values:Record<string,unknown>={};variables.forEach(v=>values[v.variable_key]=resolveSystem(v.system_value_key,raw));const out:DataRow={};cols.forEach(c=>out[c.heading]=c.formula?evalFormula(c.formula,values):values[variables.find(v=>v.id===c.variableId)?.variable_key??""]);return out;}));toast.success(`${data.length} rows generated`);
  }catch(e){toast.error(e instanceof Error?e.message:"Could not generate report")}finally{setLoading(false)}};
  const download=()=>{if(!template||!rows.length)return;const ws=XLSX.utils.json_to_sheet(rows);ws["!cols"]=cols.map(c=>({wch:Math.max(14,c.heading.length+2)}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Report");XLSX.writeFile(wb,`${safeKey(template.name)}-${year}-${month.padStart(2,"0")}.xlsx`)};
  return <div className="space-y-5"><section className="surface-card p-5"><div className="grid gap-4 md:grid-cols-4"><Field label="Template"><Select value={templateId} onValueChange={setTemplateId}><SelectTrigger><SelectValue placeholder="Select template"/></SelectTrigger><SelectContent>{templates.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></Field><Field label="Month"><Select value={month} onValueChange={setMonth}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i+1)}>{new Date(2020,i).toLocaleString("en-IN",{month:"long"})}</SelectItem>)}</SelectContent></Select></Field><Field label="Year"><Input type="number" value={year} onChange={e=>setYear(e.target.value)}/></Field><Field label="Branch"><Select value={branch} onValueChange={setBranch}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{branches.map(b=><SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}</SelectContent></Select></Field></div><div className="mt-4 flex gap-2"><Button onClick={generate} disabled={loading}>{loading?"Generating...":"Generate Report"}</Button><Button variant="outline" onClick={download} disabled={!rows.length}><Download className="mr-2 size-4"/>Download Excel</Button></div></section>
    <div className="overflow-auto rounded-xl border"><table className="w-full whitespace-nowrap text-sm"><thead className="bg-muted"><tr>{cols.map(c=><th key={c.id} className="p-3 text-left">{c.heading}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="border-t">{cols.map(c=><td key={c.id} className="p-3">{String(r[c.heading]??"")}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={Math.max(cols.length,1)} className="p-10 text-center text-muted-foreground">Select a template and filters to generate a report.</td></tr>}</tbody></table></div></div>;
}

function Field({label,children}:{label:string;children:ReactNode}) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div> }
