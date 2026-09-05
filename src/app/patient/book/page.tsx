"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
type Step = 1|2|3|4;

// build the next 14 weekdays for date selection
function dateOpts() {
  const list: {value:string;label:string;day:string}[] = [];
  const now = new Date();
  for (let i=1;i<=14;i++) {
    const d = new Date(now); d.setDate(now.getDate()+i);
    if (d.getDay()===0) continue;
    list.push({
      value: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      day: d.toLocaleDateString("en-IN",{weekday:"short"})
    });
  }
  return list;
}
// inline toast — beats alert() any day
function Toast({msg,done}:{msg:string;done:()=>void}) {
  useEffect(()=>{const t=setTimeout(done,3500);return()=>clearTimeout(t)},[done]);
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">{msg}</div>;
}

export default function BookPage() {
  const router = useRouter();
  const [step,setStep] = useState<Step>(1);
  const [svcs,setSvcs] = useState<any[]>([]);
  const [docs,setDocs] = useState<any[]>([]);
  const [slots,setSlots] = useState<string[]>([]);
  const [svc,setSvc] = useState<any>(null);
  const [doc,setDoc] = useState<any>(null);
  const [date,setDate] = useState("");
  const [time,setTime] = useState("");
  const [mode,setMode] = useState<"online"|"in_home">("in_home");
  const [notes,setNotes] = useState("");
  const [busy,setBusy] = useState(false);
  const [loadSlots,setLoadSlots] = useState(false);
  const [toast,setToast] = useState("");
  const dates = dateOpts();
  const fee = doc?(mode==="online"?doc.feeOnline:doc.feeAtHome):0;

  // grab services and doctors when the page opens
  useEffect(()=>{
    (async()=>{
      try {
        const [s,d] = await Promise.all([
          fetch("/patient/api/services").then(r=>r.ok?r.json():null),
          fetch("/patient/api/doctors").then(r=>r.ok?r.json():null),]);
        if(s) setSvcs(s.services||[]);
        if(d) setDocs(d.doctors||[]);
      } catch(e){console.error(e)}
    })();
  },[]);
  // when doctor + date are picked, fetch available slots
  useEffect(()=>{
    if(!doc||!date){setSlots([]);return}
    (async()=>{
      setLoadSlots(true);
      try {
        const r=await fetch(`/patient/api/doctors/${doc.id}/slots?date=${date}`);
        if(r.ok){
          const data=await r.json();
          setSlots(data.slots||[]);
          if(data.slots&&!data.slots.includes(time)) setTime("");
        }
      } catch(e){console.error(e)}
      finally{setLoadSlots(false)}
    })();
  },[doc,date]);
  // send the booking off to our API
  const handleBook=async()=>{
    if(!svc||!doc||!date||!time) return;
    setBusy(true);
    try {
      const r=await fetch("/patient/api/bookings",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({serviceId:svc.id,doctorId:doc.id,
          bookingType:svc.category||"consultation",consultationMode:mode,
          date,startTime:time,notes:notes||undefined}),});
      const data=await r.json();
      if(r.ok){setToast("Booking confirmed!");setTimeout(()=>router.push("/patient/bookings"),1500)}
      else setToast(data.error||"Something went wrong.");
    } catch{setToast("Network issue.")}
    finally{setBusy(false)}
  };
  // little progress dots at the top of each step
  const dots=(c:number)=>(
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1,2,3,4].map(i=><div key={i} className={`h-2 rounded-full transition-all ${i<=c?"w-8 bg-indigo-500":"w-2 bg-gray-300"}`}/>)}
    </div>);
  const bg="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8";
  const wr="max-w-2xl mx-auto";

  /* STEP 1 — What kind of visit? */
  if(step===1) return (
    <div className={bg}><div className={wr}>
      <Link href="/patient" className="text-indigo-600 text-sm mb-6 inline-flex items-center gap-1">← Dashboard</Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Book a New Visit</h1>
      <p className="text-gray-500 mb-6">What kind of appointment do you need?</p>
      {dots(1)}
      {svcs.length===0?<p className="text-center py-12 text-gray-400">Loading services...</p>:(
        <div className="grid gap-3">{svcs.map((s:any)=>(
          <button key={s.id} onClick={()=>{setSvc(s);setStep(2)}}
            className="text-left p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="font-semibold text-gray-800">{s.name}</div>
            {s.description&&<div className="text-sm text-gray-500 mt-1">{s.description}</div>}
            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              {s.category&&<span>{s.category}</span>}{s.duration&&<span>· {s.duration}</span>}
            </div></button>))}</div>)}
    </div>{toast&&<Toast msg={toast} done={()=>setToast("")}/>}</div>);

  /* STEP 2 — Pick your doctor */
  if(step===2) return (
    <div className={bg}><div className={wr}>
      <button onClick={()=>setStep(1)} className="text-indigo-600 text-sm mb-6">← Back</button>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Doctor</h1>
      <p className="text-gray-500 mb-4">For: <span className="font-medium text-indigo-600">{svc?.name}</span></p>
      {dots(2)}
      {docs.length===0?<p className="text-center py-12 text-gray-400">Loading doctors...</p>:(
        <div className="grid gap-3">{docs.map((d:any)=>(
          <button key={d.id} onClick={()=>setDoc(d)}
            className={`text-left p-4 rounded-2xl border-2 transition-all flex gap-4 ${doc?.id===d.id?"border-indigo-500 bg-indigo-50":"border-gray-200 bg-white hover:border-indigo-300"}`}>
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
              {d.avatar?<img src={d.avatar} alt={d.name} className="w-14 h-14 rounded-full object-cover"/>:d.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">{d.name}</div>
              <div className="text-sm text-indigo-600">{d.specialty}</div>
              <div className="text-xs text-gray-400 mt-1">{d.qualifications} · {d.experience}y exp</div>
              <div className="flex gap-3 mt-2 text-sm">
                {d.feeOnline>0&&<span className="text-green-600 font-medium">Online: ₹{d.feeOnline}</span>}
                {d.feeAtHome>0&&<span className="text-blue-600 font-medium">Home: ₹{d.feeAtHome}</span>}
              </div></div></button>))}</div>)}
      {doc&&(<div className="mt-6 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Consultation mode?</p>
          <div className="flex gap-3">
            <button onClick={()=>setMode("in_home")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${mode==="in_home"?"bg-indigo-600 text-white shadow-md":"bg-gray-100 text-gray-600"}`}>
              🏠 At Home{doc.feeAtHome>0?` — ₹${doc.feeAtHome}`:""}</button>
            <button onClick={()=>setMode("online")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${mode==="online"?"bg-indigo-600 text-white shadow-md":"bg-gray-100 text-gray-600"}`}>
              💻 Online{doc.feeOnline>0?` — ₹${doc.feeOnline}`:""}</button>
          </div></div>
        <button onClick={()=>{setDate("");setTime("");setStep(3)}}
          className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 shadow-md">
          Pick Date & Time →</button></div>)}
    </div>{toast&&<Toast msg={toast} done={()=>setToast("")}/>}</div>);

  /* STEP 3 — Date & Time */
  if(step===3) return (
    <div className={bg}><div className={wr}>
      <button onClick={()=>setStep(2)} className="text-indigo-600 text-sm mb-6">← Back</button>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Pick Date & Time</h1>
      <p className="text-gray-500 mb-4">With <span className="font-medium text-indigo-600">{doc?.name}</span> {mode==="online"?"(online)":"(at home)"}</p>
      {dots(3)}
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Select a date</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {dates.map((d)=>(
          <button key={d.value} onClick={()=>{setDate(d.value);setTime("")}}
            className={`shrink-0 px-4 py-3 rounded-xl text-center transition-all border-2 ${date===d.value?"border-indigo-500 bg-indigo-600 text-white":"border-gray-200 bg-white text-gray-700"}`}>
            <div className="text-xs font-medium">{d.day}</div>
            <div className="text-sm font-bold mt-0.5">{d.label}</div></button>))}</div>
      {date&&(<>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Available times{loadSlots&&<span className="text-gray-400 font-normal ml-2">loading...</span>}</h3>
        {slots.length===0&&!loadSlots?(
          <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border">No slots. Try another date?</div>):(
          <div className="grid grid-cols-3 gap-2">{slots.map((s)=>(
            <button key={s} onClick={()=>setTime(s)}
              className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${time===s?"border-indigo-500 bg-indigo-600 text-white":"border-gray-200 bg-white text-gray-700"}`}>{s}</button>))}</div>)}</>)}
      {date&&time&&<button onClick={()=>setStep(4)} className="w-full mt-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 shadow-md">Review →</button>}
    </div>{toast&&<Toast msg={toast} done={()=>setToast("")}/>}</div>);

  /* STEP 4 — Review & Confirm */
  return (
    <div className={bg}><div className={wr}>
      <button onClick={()=>setStep(3)} className="text-indigo-600 text-sm mb-6">← Back</button>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Review Your Booking</h1>
      <p className="text-gray-500 mb-4">Check everything, then confirm.</p>
      {dots(4)}
      <div className="bg-white rounded-2xl border p-5 space-y-4">
        <div><div className="text-xs text-gray-400 uppercase">Visit Type</div><div className="font-semibold text-gray-800 mt-0.5">{svc?.name}</div></div>
        <div className="border-t pt-4"><div className="text-xs text-gray-400 uppercase">Doctor</div>
          <div className="flex items-center gap-3 mt-1"><div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{doc?.name.charAt(0)}</div>
          <div><div className="font-semibold text-gray-800">{doc?.name}</div><div className="text-sm text-indigo-600">{doc?.specialty}</div></div></div></div>
        <div className="border-t pt-4"><div className="text-xs text-gray-400 uppercase">Mode</div><div className="font-medium text-gray-700 mt-0.5">{mode==="online"?"💻 Online":"🏠 At Home"}</div></div>
        <div className="border-t pt-4"><div className="text-xs text-gray-400 uppercase">Date & Time</div>
          <div className="font-medium text-gray-700 mt-0.5">{date&&new Date(date).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} at {time}</div></div>
        <div className="border-t pt-4"><div className="text-xs text-gray-400 uppercase">Fee</div><div className="text-xl font-bold text-indigo-600 mt-0.5">₹{fee}</div></div>
        <div className="border-t pt-4"><label className="text-xs text-gray-400 uppercase">Notes for the doctor (optional)</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Symptoms, concerns..." className="w-full mt-1 p-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={3}/></div>
      </div>
      <button onClick={handleBook} disabled={busy} className={`w-full mt-6 py-3.5 rounded-2xl font-semibold text-white shadow-md ${busy?"bg-indigo-400":"bg-indigo-600 hover:bg-indigo-700"}`}>
        {busy?"Booking...":`Confirm — ₹${fee}`}</button>
    </div>{toast&&<Toast msg={toast} done={()=>setToast("")}/>}</div>);
}
