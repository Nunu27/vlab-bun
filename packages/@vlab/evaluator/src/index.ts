import { Evaluator } from "./base/evaluator";

import linux from "./handlers/linux";
import mikrotik from "./handlers/mikrotik";
import nodeInterface from "./handlers/node-interface";

export default new Evaluator()
	.register(nodeInterface)
	.register(mikrotik)
	.register(linux);
