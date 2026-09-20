import test from "node:test"; import assert from "node:assert/strict";
import { createAgroEvent, validateAgroEvent, entityRef } from "../src/index.js";
import { createAgroBridge, createPairingSecret, sendAgroEvent } from "../src/bridge.js";

test("contrato cria identidade global e valida versão",()=>{
 const e=createAgroEvent({event:"machine.usage.recorded",source:"maquinas-agricolas",entityId:"JD-1",data:{hours:3.2,costMinor:59200}});
 assert.equal(validateAgroEvent(e),e); assert.equal(entityRef("maquinas-agricolas","machine","JD-1"),"artisys://maquinas-agricolas/machine/JD-1");
});
test("bridge local autentica e deduplica eventos",async()=>{
 const secret=createPairingSecret(), received=[];
 const bridge=createAgroBridge({productId:"lavoura",port:0,secret,onEvent:async e=>received.push(e)});
 const address=await bridge.start(); const url=`http://127.0.0.1:${address.port}`;
 const event=createAgroEvent({event:"machine.usage.recorded",source:"maquinas-agricolas",entityId:"JD-1"});
 const first=await sendAgroEvent({url,secret,event}); const second=await sendAgroEvent({url,secret,event});
 assert.equal(first.duplicate,false); assert.equal(second.duplicate,true); assert.equal(received.length,1); await bridge.stop();
});
