import { createClient } from "npm:@supabase/supabase-js@2.119.0";
const cors={"Access-Control-Allow-Origin":"https://bazaku22.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const leagues=[["PL","Premier League","epl"],["PD","La Liga","laliga"],["BL1","Bundesliga","bundesliga"],["SA","Serie A","seriea"],["FL1","Ligue 1","ligue1"]];
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const authorization=req.headers.get("Authorization")||"",token=authorization.replace(/^Bearer\s+/i,"");
 if(!token||token===authorization)return reply({error:"ต้องเข้าสู่ระบบก่อน"},401);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}"),key=keys.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!url||!key)throw new Error("Supabase client configuration is missing");
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
  const {data:auth,error:authErr}=await sb.auth.getUser(token);
  if(authErr||!auth.user)return reply({error:"เซสชันไม่ถูกต้องหรือหมดอายุ"},401);
  const body=await req.json().catch(()=>({}));
  if(body?.action!=="sync"){
   const [p,s]=await Promise.all([
    sb.from("player_records").select("id,provider,provider_player_id,player_name,league_id,team_id,season,position,profile,stats,source_metadata,updated_at").eq("user_id",auth.user.id).order("player_name").limit(5000),
    sb.from("player_sync_runs").select("provider,status,started_at,finished_at,records_seen,records_upserted,error_summary").eq("user_id",auth.user.id).order("started_at",{ascending:false}).limit(1)
   ]);
   if(p.error)throw p.error;if(s.error)throw s.error;
   return reply({records:p.data||[],latestSync:s.data?.[0]||null,user:{id:auth.user.id,email:auth.user.email||null}});
  }
  const apiKey=Deno.env.get("API_NINJAS_API_KEY")||"";
  if(!apiKey)return reply({error:"ยังไม่ได้ตั้งค่า API_NINJAS_API_KEY ใน Supabase Edge Function Secrets"},503);
  const userId=auth.user.id;
  const {data:run,error:runErr}=await sb.from("player_sync_runs").insert({user_id:userId,provider:"API Ninjas",status:"running",metadata:{leagues:leagues.map(x=>x[2])}}).select("id").single();
  if(runErr)throw runErr;
  const rows:any[]=[],counts:Record<string,number>={},failures:string[]=[];
  for(const [leagueId,leagueName,apiLeague] of leagues){
   try{
    const endpoint=new URL("https://api.api-ninjas.com/v1/soccerplayers");endpoint.searchParams.set("league",apiLeague);
    const response=await fetch(endpoint,{headers:{"X-Api-Key":apiKey}});
    if(!response.ok)throw new Error("API Ninjas HTTP "+response.status);
    const players=await response.json();if(!Array.isArray(players))throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
    counts[leagueId]=players.length;
    for(const p of players){
     if(!p?.player_id||!p?.name)continue;const t=p.team||{};
     rows.push({user_id:userId,provider:"api-ninjas",provider_player_id:String(p.player_id),player_name:String(p.name),league_id:leagueId,team_id:String(t.team_id||""),season:"2026",position:p.position||null,
      profile:{firstName:p.first_name||null,lastName:p.last_name||null,teamName:t.name||null,teamAbbreviation:t.abbreviation||null,leagueName,nationality:p.nationality||null,birthDate:p.birth_date||null,jerseyNumber:p.jersey_number??null,heightCm:p.height_cm??null,weightKg:p.weight_kg??null,rosterStatus:p.roster_status||null},
      stats:{},source_metadata:{provider:"API Ninjas",endpoint:"/v1/soccerplayers",fetchedAt:new Date().toISOString(),seasonLabel:"2026-27"}});
    }
   }catch(e){failures.push(leagueId+": "+(e instanceof Error?e.message:"request failed"));}
  }
  if(!rows.length){const msg=failures.join("; ")||"API Ninjas ไม่ส่งข้อมูลนักเตะกลับมา";await sb.from("player_sync_runs").update({status:"failed",finished_at:new Date().toISOString(),error_summary:msg}).eq("id",run.id).eq("user_id",userId);return reply({error:msg},502);}
  const {error:upsertErr}=await sb.from("player_records").upsert(rows,{onConflict:"user_id,provider,provider_player_id,league_id,team_id,season"});
  if(upsertErr)throw upsertErr;
  const status=failures.length?"partial":"success";
  const {error:finishErr}=await sb.from("player_sync_runs").update({status,finished_at:new Date().toISOString(),records_seen:rows.length,records_upserted:rows.length,error_summary:failures.join("; ")||null,metadata:{leagueCounts:counts,failedLeagues:failures}}).eq("id",run.id).eq("user_id",userId);
  if(finishErr)throw finishErr;
  const {data:records,error:readErr}=await sb.from("player_records").select("id,provider,provider_player_id,player_name,league_id,team_id,season,position,profile,stats,source_metadata,updated_at").eq("user_id",userId).order("player_name").limit(5000);
  if(readErr)throw readErr;
  return reply({records:records||[],latestSync:{provider:"API Ninjas",status,records_seen:rows.length,records_upserted:rows.length,error_summary:failures.join("; ")||null},sync:{leagueCounts:counts,failures}});
 }catch(e){return reply({error:e instanceof Error?e.message:"Unexpected server error"},500);}
});