const qty=v=>{const n=Number(v);if(!Number.isFinite(n))throw new TypeError('quantity must be finite');return n};
export function createInventory(items=[]){return Object.fromEntries(items.map(i=>[String(i.sku),{sku:String(i.sku),onHand:qty(i.onHand??0),reserved:qty(i.reserved??0)}]))}
export function availableQuantity(item){return qty(item?.onHand??0)-qty(item?.reserved??0)}
export function applyMovement(state,{sku,delta}){sku=String(sku);const current=state[sku]??{sku,onHand:0,reserved:0};return {...state,[sku]:{...current,onHand:current.onHand+qty(delta)}}}
export function reserveStock(state,sku,amount){sku=String(sku);amount=qty(amount);const current=state[sku]??{sku,onHand:0,reserved:0};if(amount<0)throw new RangeError('amount must be >= 0');if(availableQuantity(current)<amount)throw new RangeError('insufficient stock');return {...state,[sku]:{...current,reserved:current.reserved+amount}}}
export function releaseStock(state,sku,amount){sku=String(sku);amount=qty(amount);const current=state[sku];if(!current||amount<0||current.reserved<amount)throw new RangeError('invalid release');return {...state,[sku]:{...current,reserved:current.reserved-amount}}}
