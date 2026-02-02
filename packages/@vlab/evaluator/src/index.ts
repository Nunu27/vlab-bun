import { Evaluator } from "./base/evaluator";
import nodeInterface from "./handlers/node-interface";

export default new Evaluator().register(nodeInterface);
