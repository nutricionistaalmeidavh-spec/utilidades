import { compileVideoPlan } from '../src/index.mjs'; console.log(compileVideoPlan({input:'in.mp4',output:{path:'out.mp4',format:'mp4'},operations:[{type:'trim',start:0,end:5}]}));
