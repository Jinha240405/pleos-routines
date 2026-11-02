// The device reports supported areas and ranges; the catalog alone cannot supply them.
export function capabilityHints(op,result,args=[]){
 const values=Array.isArray(result?.values)?result.values:[result];
 const area=op.params.find(p=>p.kind==='area'),areaIndex=op.params.indexOf(area);
 const maps=area?values.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).some(k=>k.split('|').every(s=>area.options.includes(s)))):[];
 const map=maps[0],areas=map?Object.keys(map).filter(k=>k.split('|').every(s=>area.options.includes(s))):undefined;
 const constraint=map?.[args[areaIndex]]??(!area?values.find(v=>v&&typeof v==='object'&&('minValue'in v||Array.isArray(v))):undefined);
 const calibration=values.find(v=>v&&typeof v==='object'&&'minCelsius'in v);
 const unitAt=op.params.findIndex(p=>p.type?.endsWith('TemperatureUnit')),fahrenheit=args[unitAt]==='FAHRENHEIT';
 const range=calibration?{min:calibration[fahrenheit?'minFahrenheit':'minCelsius'],max:calibration[fahrenheit?'maxFahrenheit':'maxCelsius'],step:calibration[fahrenheit?'incrementFahrenheit':'incrementCelsius']}:{min:constraint?.minValue,max:constraint?.maxValue};
 return {areas,range,enums:Array.isArray(constraint)?constraint:undefined,access:values.find(v=>v?.accessType)?.accessType};
}
