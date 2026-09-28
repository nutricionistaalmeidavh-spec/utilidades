import { createAgroEvent } from "../src/index.js";
import { resolveAgroConflict } from "../src/sync.js";

const usage=createAgroEvent({event:"machine.usage.recorded",source:"maquinas-agricolas",entityId:"JD-6110J",data:{hours:3.2,costMinor:59200},links:{fieldId:"talhao-04",seasonId:"soja-26-27"}});
const resolved=resolveAgroConflict({local:usage,remote:null});
if(resolved.value.eventId!==usage.eventId)process.exit(1);
console.log("ArtiSys Agro v1 example OK");
