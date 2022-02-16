import {InitEnvVars} from "./utils/env";

InitEnvVars();

import {StartBlockchainListener} from "./dapp/listener";

StartBlockchainListener('BTC');