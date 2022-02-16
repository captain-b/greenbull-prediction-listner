import {InitEnvVars} from "./utils/env";

InitEnvVars();

import {StartBlockchainListener} from "./dapp/listener";

if (process.env.ENABLED === 'true') {
    StartBlockchainListener('BTC');
}
