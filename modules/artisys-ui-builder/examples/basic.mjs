import { toGrapesJsProject, toPuckData } from '../src/index.mjs';
const page = { id: 'home', title: 'Home', blocks: [{ id: 'hero', type: 'container', props: { className: 'hero' }, children: [{ id: 'title', type: 'heading', props: { text: 'Tecnologia construída para negócios reais.' }, children: [] }] }] };
console.log(toGrapesJsProject(page));
console.log(toPuckData(page));
