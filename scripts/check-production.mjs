import {configuration} from '../server/config.mjs';
import {productionReadiness} from '../server/readiness.mjs';
const result=productionReadiness(configuration());
console.log(JSON.stringify(result,null,2));
process.exitCode=result.ready?0:1;
