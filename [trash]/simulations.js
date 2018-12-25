/**
 * Module Simulations
 *
 * This script tries to simulate different types of ECMAScript module bindings.
 *
 * @author Saleh Abdel Motaal <smotaal@gmail.com>
 */

{
  const logs = new Logs();
  const {stringify} = JSON;

  const expressions = ['this', 'arguments'];
  const Expression = expression => `
try { log(${stringify(`${expression} => %o`)}, ${expression}) }
catch (thrown) { warn(thrown); }
`;


  (logs => {
    logs.arguments = undefined;
    logs.this = undefined;
    with (logs)
      (() => {
        const evaluate = code => {
          eval(`'use strict';${code}`);
        };
        for (const expression of expressions) evaluate(Expression(expression));
      })();
  })(logs.group(`this`));

  logs.dump();

  function Logs() {
    const {log, warn, error, info, group, groupEnd} = console;
    const empty = [];
    return new (Logs = class Logs extends Array {
      /* prettier-ignore */
      constructor(parent, ...logs) {
        super(... logs);
        this.top = (this.parent = parent || this).top || this;
        this.log = (... args) => void this.push([log, args]);
        this.warn = (... args) => void this.push([warn, args]);
        this.error = (... args) => void this.push([error, args]);
        this.info = (... args) => void this.push([info, args]);
        this.group = (... args) => this.begin(... args);
        this.groupEnd = () => this.end();
        // this.dump = () => this.dump();
      }
      begin(...args) {
        const logs = new Logs(this);
        logs.head = [group, args];
        logs.foot = [groupEnd];
        this.push(logs);
        return logs;
      }
      end() {
        return this.parent || this;
      }
      dump() {
        if (!this.length) return;
        const {head, foot} = this;
        head && Reflect.apply(head[0], console, head[1] || empty);
        for (const log of this.splice(0, this.length)) {
          log.dump ? log.dump() : Reflect.apply(log[0], console, log[1] || empty);
        }
        foot && Reflect.apply(foot[0], console, foot[1] || empty);
      }
    })();
  }
}
