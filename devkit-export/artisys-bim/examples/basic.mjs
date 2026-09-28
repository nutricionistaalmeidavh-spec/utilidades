import { createIfcOpenShellJob } from '../src/index.mjs';
console.log(JSON.stringify(createIfcOpenShellJob({ file: 'model.ifc', operation: 'summary' }), null, 2));
