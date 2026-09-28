export class AgroOutbox {
 constructor({send,maxAttempts=5}){this.send=send;this.maxAttempts=maxAttempts;this.queue=new Map();}
 enqueue(event){if(!this.queue.has(event.eventId))this.queue.set(event.eventId,{event,attempts:0,status:"pending"});return this.queue.get(event.eventId);}
 async flush(){
  const results=[];
  for(const item of this.queue.values()){
   if(item.status==="sent"||item.status==="conflict")continue;
   try{item.attempts++;const result=await this.send(item.event);item.status="sent";item.result=result;results.push(item);}
   catch(error){item.error=error.message;item.status=item.attempts>=this.maxAttempts?"failed":"pending";results.push(item);}
  }
  return results;
 }
}

export function resolveAgroConflict({local,remote,strategy="newest"}) {
 if(!local)return {winner:"remote",value:remote};
 if(!remote)return {winner:"local",value:local};
 if(local.eventId===remote.eventId)return {winner:"same",value:local};
 if(strategy==="manual")return {winner:"conflict",value:null,local,remote};
 const lt=Date.parse(local.occurredAt)||0, rt=Date.parse(remote.occurredAt)||0;
 if(rt>lt)return {winner:"remote",value:remote};
 if(lt>rt)return {winner:"local",value:local};
 return String(remote.eventId)>String(local.eventId)?{winner:"remote",value:remote}:{winner:"local",value:local};
}
