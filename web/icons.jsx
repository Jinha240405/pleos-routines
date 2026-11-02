import React from 'react';
import {Radar,Hash,Type,Calculator,ClipboardList,Layers,Link,FileJson, CircleCheck, CircleX} from 'lucide-react';
import { AirVent, Armchair, DoorOpen, PanelTop, Lightbulb, BatteryCharging, Fuel, CircleGauge, CircleDot, ScanEye, Wind, MoveHorizontal, GitBranch, ShieldCheck, CreditCard, Monitor, CarFront, MapPin, Navigation, Mic, Volume2, Sparkles, Thermometer, Fan, Plus, Minus, Check, X, ChevronLeft, ChevronRight, LayoutGrid, Repeat2, Timer, Bell, Brackets, GripVertical, Ellipsis, Square, Play, SlidersHorizontal, Waves, Search, Trash2, Eye, Pencil, ChevronUp, ChevronDown, ArrowDown, Activity } from 'lucide-react';

const icons={HVAC:AirVent,Seat:Armchair,Door:DoorOpen,Window:PanelTop,Light:Lightbulb,EvBattery:BatteryCharging,Fuel,SteeringWheel:CircleGauge,SideMirror:ScanEye,Wiper:Waves,TurnSignal:MoveHorizontal,Gear:GitBranch,Brake:CircleDot,DrivingMode:CircleGauge,Odometer:CircleGauge,Tire:CircleDot,Safety:ShieldCheck,Toll:CreditCard,Display:Monitor,CarInfo:CarFront,Location:MapPin,Navi:Navigation,STT:Mic,TTS:Volume2,Gleo:Sparkles,play:Play,stop:Square,branch:GitBranch,repeat:Repeat2,clock:Timer,climate:Thermometer,fan:Fan,bell:Bell,volume:Volume2,variable:Brackets,activity:Activity,plus:Plus,minus:Minus,check:Check,close:X,back:ChevronLeft,next:ChevronRight,grid:LayoutGrid,drag:GripVertical,more:Ellipsis,settings:SlidersHorizontal,search:Search,trash:Trash2,read:Eye,edit:Pencil,up:ChevronUp,down:ChevronDown,arrow:ArrowDown};
const automotive={
 Seat:'M7 3v8a4 4 0 0 0 4 4h8v4H9a6 6 0 0 1-6-6V3h4Zm3 17v2m7-2v2',
 Door:'M3 20V9l7-6h9a2 2 0 0 1 2 2v15H3Zm2-10h14V5h-8l-6 5Zm10 4h3',
 Window:'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2l1 13H2L3 6Zm2 1h14M8 11l-2 3m6-3-2 3',
 SideMirror:'M8 5h8a5 5 0 0 1 0 10H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm1 10-3 5H2m8-12 5 4',
 SteeringWheel:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM4 9l6 3m10-3-6 3m-2 2v7M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 Wiper:'M4 5a24 24 0 0 1 16 0l2 13H2L4 5Zm4 15 9-11m-4-2 6 5',
 Tire:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0M10 4l2 2m3-1 2 3m3 3-2 2m0 5-3-1m-3 3-2-2m-6-3 2-2m0-5 3 1',
 Brake:'M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M3 5a11 11 0 0 0 0 14M21 5a11 11 0 0 1 0 14M12 8v5m0 3h.01'
};
Object.assign(icons,{radar:Radar,number:Hash,text:Type,calculator:Calculator,result:ClipboardList,layers:Layers,link:Link,json:FileJson,yes:CircleCheck,no:CircleX});
export function Icon({name,...props}){if(automotive[name])return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={automotive[name]}/></svg>;const Glyph=icons[name]||CarFront;return <Glyph size={24} strokeWidth={1.75} aria-hidden="true" {...props}/>}
export function operationIcon(op){return /Temperature/.test(op?.method)?'climate':/FanSpeed/.test(op?.method)?'fan':op?.domain||'activity'}
