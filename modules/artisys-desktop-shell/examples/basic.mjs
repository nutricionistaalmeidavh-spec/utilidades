import { createDesktopShellManifest } from '../src/index.mjs'; console.log(createDesktopShellManifest({appId:'com.artisys.demo',userDataDir:'./data',deepLinkSchemes:['artisys']}));
