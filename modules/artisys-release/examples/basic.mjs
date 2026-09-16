import { createPipelinePlan, createReleasePlan } from '../src/index.mjs';

console.log(createReleasePlan({product:'demo',version:'1.0.0',artifacts:['demo.exe']}));
console.log(createPipelinePlan({product:'demo',version:'1.0.0',profile:'release',requiredSteps:['build','installer','qa'],steps:{build:'npm run build',installer:'npm run dist',qa:'npm run qa:e2e'}}));
