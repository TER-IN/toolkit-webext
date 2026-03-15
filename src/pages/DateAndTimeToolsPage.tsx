import { useState, useCallback, useEffect, useRef } from "react";
import {
    Calendar,
    Clock,
    Plus,
    Minus,
    Hourglass,
    TimerReset,
    Binary
} from "lucide-react";
import { format, differenceInYears, differenceInMonths, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, addYears, addMonths as addM, addDays as addD, addHours, addMinutes, addSeconds, subYears, subMonths as subM, subDays, subHours, subMinutes, subSeconds } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SubTool {
    id: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const SUB_TOOLS: SubTool[] = [
    { id: "age-calculator", label: "Age Calculator", description: "Calculate exact age from a date of birth.", icon: Calendar },
    { id: "datetime-difference", label: "Date/Time Difference", description: "Find the difference between two dates and times.", icon: Clock },
    { id: "add-to-date", label: "Add to a Date", description: "Add time units to a specific date.", icon: Plus },
    { id: "subtract-from-date", label: "Subtract from a Date", description: "Subtract time units from a specific date.", icon: Minus },
    { id: "stopwatch", label: "Stopwatch", description: "A simple stopwatch.", icon: TimerReset },
    { id: "unix-to-date", label: "Unix to Date/Time", description: "Convert a Unix timestamp to human-readable format.", icon: Binary },
    { id: "date-to-unix", label: "Date/Time to Unix", description: "Convert a human-readable date/time to Unix timestamp.", icon: Binary },
    { id: "timer", label: "Timer", description: "A countdown timer.", icon: Hourglass },
];

export function DateAndTimeToolsPage() {
    const [activeToolId, setActiveToolId] = useState(SUB_TOOLS[0].id);
    const activeTool = SUB_TOOLS.find((t) => t.id === activeToolId)!;

    const handleToolChange = useCallback((toolId: string) => { setActiveToolId(toolId); }, []);

    // Tool State Variables Here (to be filled below)
    // 3.2.1 Age Calculator
    const [ageDob, setAgeDob] = useState<string>("");
    const [ageCompare, setAgeCompare] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

    // 3.2.2 Datetime diff
    const [diffStart, setDiffStart] = useState<string>("");
    const [diffEnd, setDiffEnd] = useState<string>("");

    // 3.2.3 Add to Date
    const [addBase, setAddBase] = useState<string>("");
    const [addYearsState, setAddYears] = useState(0);
    const [addMonthsState, setAddMonths] = useState(0);
    const [addDaysState, setAddDays] = useState(0);
    const [addHoursState, setAddHours] = useState(0);
    const [addMinutesState, setAddMinutes] = useState(0);
    const [addSecondsState, setAddSeconds] = useState(0);

    // 3.2.4 Sub from Date
    const [subBase, setSubBase] = useState<string>("");
    const [subYearsState, setSubYears] = useState(0);
    const [subMonthsState, setSubMonths] = useState(0);
    const [subDaysState, setSubDays] = useState(0);
    const [subHoursState, setSubHours] = useState(0);
    const [subMinutesState, setSubMinutes] = useState(0);
    const [subSecondsState, setSubSeconds] = useState(0);

    // 3.2.5 Stopwatch
    const [swTime, setSwTime] = useState(0);
    const [swRunning, setSwRunning] = useState(false);
    const swIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // 3.2.6 Unix to Date
    const [unixInput, setUnixInput] = useState<string>("");

    // 3.2.7 Date to Unix
    const [dateToUnixInput, setDateToUnixInput] = useState<string>("");

    // 3.2.8 Timer
    const [timerInput, setTimerInput] = useState(60); // seconds
    const [timerLeft, setTimerLeft] = useState(60);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // --- Effects ---
    useEffect(() => {
        if (swRunning) {
            swIntervalRef.current = setInterval(() => {
                setSwTime(t => t + 10); // 10ms intervals
            }, 10);
        } else if (!swRunning && swIntervalRef.current) {
            clearInterval(swIntervalRef.current);
        }
        return () => { if (swIntervalRef.current) clearInterval(swIntervalRef.current); };
    }, [swRunning]);

    useEffect(() => {
        if (timerRunning && timerLeft > 0) {
            timerIntervalRef.current = setInterval(() => {
                setTimerLeft(t => t - 1);
            }, 1000);
        } else if (timerLeft <= 0) {
            setTimerRunning(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [timerRunning, timerLeft]);

    // --- Tool Renderers ---
    const renderAgeCalculator = () => {
        let result = "";
        if (ageDob && ageCompare) {
            const d1 = new Date(ageDob);
            const d2 = new Date(ageCompare);
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                const y = differenceInYears(d2, d1);
                // Simple approx for months and days for UI, exact math gets tricky without dedicated funcs that break down the remainder
                const d1y = addYears(d1, y);
                const m = differenceInMonths(d2, d1y);
                const d1ym = addM(d1y, m);
                const d = differenceInDays(d2, d1ym);

                result = `${y} years, ${m} months, ${d} days`;
            }
        }
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={ageDob} onChange={e => setAgeDob(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Compare With</Label><Input type="date" value={ageCompare} onChange={e => setAgeCompare(e.target.value)} /></div>
                </div>
                {result && <div className="p-4 border rounded bg-muted">Age: <strong>{result}</strong></div>}
            </div>
        );
    };

    const renderDatetimeDifference = () => {
        let resYears=0, resMonths=0, resDays=0, resHours=0, resMinutes=0, resSeconds=0;
        let diffStr = "";
        if (diffStart && diffEnd) {
             const d1 = new Date(diffStart);
             const d2 = new Date(diffEnd);
             if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                 const totalSeconds = Math.abs(differenceInSeconds(d2, d1));
                 resYears = Math.abs(differenceInYears(d2, d1));
                 resMonths = Math.abs(differenceInMonths(d2, d1));
                 resDays = Math.abs(differenceInDays(d2, d1));
                 resHours = Math.abs(differenceInHours(d2, d1));
                 resMinutes = Math.abs(differenceInMinutes(d2, d1));
                 resSeconds = totalSeconds;
                 diffStr = `${resDays} Days, ${resHours % 24} Hours, ${resMinutes % 60} Minutes, ${resSeconds % 60} Seconds`;
             }
        }
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Start Date/Time</Label><Input type="datetime-local" value={diffStart} onChange={e => setDiffStart(e.target.value)} /></div>
                    <div className="space-y-2"><Label>End Date/Time</Label><Input type="datetime-local" value={diffEnd} onChange={e => setDiffEnd(e.target.value)} /></div>
                </div>
                {diffStr && (
                   <div className="space-y-2 border rounded p-4 bg-muted">
                        <div>Difference: <strong>{diffStr}</strong></div>
                        <div className="text-xs text-muted-foreground mt-2 border-t pt-2 grid grid-cols-2 gap-2">
                           <div className="col-span-2">Years: {resYears} / Months: {resMonths}</div>
                           <div>Days: {resDays}</div>
                           <div>Hours: {resHours}</div>
                           <div>Minutes: {resMinutes}</div>
                           <div>Seconds: {resSeconds}</div>
                        </div>
                   </div>
                )}
            </div>
        );
    };

    const renderAddToDate = () => {
        let result = "";
        if (addBase) {
            const d = new Date(addBase);
            if (!isNaN(d.getTime())) {
                let res = addYears(d, addYearsState || 0);
                res = addM(res, addMonthsState || 0);
                res = addD(res, addDaysState || 0);
                res = addHours(res, addHoursState || 0);
                res = addMinutes(res, addMinutesState || 0);
                res = addSeconds(res, addSecondsState || 0);
                result = format(res, "yyyy-MM-dd HH:mm:ss");
            }
        }
        return (
             <div className="space-y-4">
                 <div className="space-y-2"><Label>Base Date/Time</Label><Input type="datetime-local" value={addBase} onChange={e => setAddBase(e.target.value)} /></div>
                 <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Years</Label><Input type="number" value={addYearsState} onChange={e=>setAddYears(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Months</Label><Input type="number" value={addMonthsState} onChange={e=>setAddMonths(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Days</Label><Input type="number" value={addDaysState} onChange={e=>setAddDays(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hours</Label><Input type="number" value={addHoursState} onChange={e=>setAddHours(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Minutes</Label><Input type="number" value={addMinutesState} onChange={e=>setAddMinutes(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Seconds</Label><Input type="number" value={addSecondsState} onChange={e=>setAddSeconds(Number(e.target.value))} /></div>
                 </div>
                 {result && <div className="p-4 border rounded bg-muted">Result: <strong>{result}</strong></div>}
             </div>
        );
    };

    const renderSubFromDate = () => {
        let result = "";
        if (subBase) {
            const d = new Date(subBase);
            if (!isNaN(d.getTime())) {
                let res = subYears(d, subYearsState || 0);
                res = subM(res, subMonthsState || 0);
                res = subDays(res, subDaysState || 0);
                res = subHours(res, subHoursState || 0);
                res = subMinutes(res, subMinutesState || 0);
                res = subSeconds(res, subSecondsState || 0);
                result = format(res, "yyyy-MM-dd HH:mm:ss");
            }
        }
        return (
             <div className="space-y-4">
                 <div className="space-y-2"><Label>Base Date/Time</Label><Input type="datetime-local" value={subBase} onChange={e => setSubBase(e.target.value)} /></div>
                 <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label className="text-xs">Years</Label><Input type="number" value={subYearsState} onChange={e=>setSubYears(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Months</Label><Input type="number" value={subMonthsState} onChange={e=>setSubMonths(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Days</Label><Input type="number" value={subDaysState} onChange={e=>setSubDays(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Hours</Label><Input type="number" value={subHoursState} onChange={e=>setSubHours(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Minutes</Label><Input type="number" value={subMinutesState} onChange={e=>setSubMinutes(Number(e.target.value))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Seconds</Label><Input type="number" value={subSecondsState} onChange={e=>setSubSeconds(Number(e.target.value))} /></div>
                 </div>
                 {result && <div className="p-4 border rounded bg-muted">Result: <strong>{result}</strong></div>}
             </div>
        );
    };

    const renderStopwatch = () => {
        const ms = swTime % 1000;
        const s = Math.floor((swTime / 1000) % 60);
        const m = Math.floor((swTime / 60000) % 60);
        const h = Math.floor(swTime / 3600000);

        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0').slice(0,2)}`;

        return (
            <div className="space-y-6 flex flex-col items-center p-8 border rounded-lg bg-card">
               <div className="text-5xl font-mono tracking-wider">{formatted}</div>
               <div className="flex gap-4">
                  <Button onClick={() => setSwRunning(!swRunning)}>{swRunning ? 'Pause' : 'Start'}</Button>
                  <Button variant="outline" onClick={() => { setSwRunning(false); setSwTime(0); }}>Reset</Button>
               </div>
            </div>
        );
    };

    const renderUnixToDate = () => {
        let result = "";
        if (unixInput) {
             const ts = Number(unixInput);
             if (!isNaN(ts)) {
                 // Check if it's likely seconds instead of ms
                 const isSeconds = ts < 100000000000; 
                 const date = new Date(isSeconds ? ts * 1000 : ts);
                 if (!isNaN(date.getTime())) {
                      result = format(date, "yyyy-MM-dd HH:mm:ss OOOO");
                 } else {
                      result = "Invalid Timestamp";
                 }
             }
        }
        return (
            <div className="space-y-4">
                <div className="space-y-2"><Label>Unix Timestamp (seconds or ms)</Label><Input type="number" placeholder="1710522061" value={unixInput} onChange={e=>setUnixInput(e.target.value)} /></div>
                {result && <div className="p-4 border rounded bg-muted">Date string: <strong>{result}</strong></div>}
            </div>
        );
    };

    const renderDateToUnix = () => {
        let resSeconds = "";
        let resMs = "";
        if (dateToUnixInput) {
            const d = new Date(dateToUnixInput);
            if (!isNaN(d.getTime())) {
                resMs = d.getTime().toString();
                resSeconds = Math.floor(d.getTime() / 1000).toString();
            }
        }
        return (
            <div className="space-y-4">
                <div className="space-y-2"><Label>Date/Time String</Label><Input type="datetime-local" value={dateToUnixInput} onChange={e=>setDateToUnixInput(e.target.value)} /></div>
                {resSeconds && (
                    <div className="p-4 border rounded bg-muted space-y-2">
                         <div>Unix Timestamp (seconds): <strong>{resSeconds}</strong></div>
                         <div>Unix Timestamp (ms): <strong>{resMs}</strong></div>
                    </div>
                )}
            </div>
        );
    };

    const renderTimer = () => {
        const s = timerLeft % 60;
        const m = Math.floor((timerLeft / 60) % 60);
        const h = Math.floor(timerLeft / 3600);
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        return (
             <div className="space-y-6 flex flex-col items-center p-8 border rounded-lg bg-card">
                 {!timerRunning && timerLeft === timerInput ? (
                    <div className="flex gap-2 items-center">
                        <Input type="number" className="w-24 text-center" value={Math.floor(timerInput/60)} onChange={e => { setTimerInput(Number(e.target.value)*60 + timerInput%60); setTimerLeft(Number(e.target.value)*60 + timerInput%60); }} placeholder="Min" />
                        <span>:</span>
                        <Input type="number" className="w-24 text-center" value={timerInput%60} onChange={e => { setTimerInput(Math.floor(timerInput/60)*60 + Number(e.target.value)); setTimerLeft(Math.floor(timerInput/60)*60 + Number(e.target.value)); }} placeholder="Sec" />
                    </div>
                 ) : (
                    <div className="text-5xl font-mono tracking-wider">{formatted}</div>
                 )}
               <div className="flex gap-4">
                  <Button onClick={() => setTimerRunning(!timerRunning)} disabled={timerLeft===0}>{timerRunning ? 'Pause' : 'Start'}</Button>
                  <Button variant="outline" onClick={() => { setTimerRunning(false); setTimerLeft(timerInput); }}>Reset</Button>
               </div>
            </div>
        );
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 max-w-4xl">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Date & Time Tools</h1>
                    <p className="text-sm text-muted-foreground mt-1">Utils for manipulating, formatting, and tracking time.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {SUB_TOOLS.map((tool) => {
                        const Icon = tool.icon;
                        const isActive = tool.id === activeToolId;
                        return (
                            <Tooltip key={tool.id}>
                                <TooltipTrigger asChild>
                                    <Button variant={isActive ? "default" : "outline"} size="sm" onClick={() => handleToolChange(tool.id)} className="shrink-0">
                                        <Icon className="mr-2 h-4 w-4" />{tool.label}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{tool.description}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                     {(() => {
                         const Icon = activeTool.icon;
                         return (
                             <>
                                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                     <Icon className="h-5 w-5 text-primary" />
                                 </div>
                                 <div>
                                     <p className="font-medium text-sm">{activeTool.label}</p>
                                     <p className="text-xs text-muted-foreground">{activeTool.description}</p>
                                 </div>
                             </>
                         );
                     })()}
                </div>

                {/* Sub Tool Rendering */}
                {activeToolId === "age-calculator" && renderAgeCalculator()}
                {activeToolId === "datetime-difference" && renderDatetimeDifference()}
                {activeToolId === "add-to-date" && renderAddToDate()}
                {activeToolId === "subtract-from-date" && renderSubFromDate()}
                {activeToolId === "stopwatch" && renderStopwatch()}
                {activeToolId === "unix-to-date" && renderUnixToDate()}
                {activeToolId === "date-to-unix" && renderDateToUnix()}
                {activeToolId === "timer" && renderTimer()}
            </div>
        </TooltipProvider>
    );
}
