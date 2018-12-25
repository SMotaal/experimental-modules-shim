/// <reference path="./global-context.js" />

class BrowserContext extends GlobalContext {
  constructor(globals) {
    let iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts allow-same-origin';
    iframe.style.display = 'none';
    // iframe.srcdoc = '<html><body></body></html>';
    let scope;
    document.body.append(iframe);
    const {dispose} = super(iframe.contentWindow, ...arguments);
    // this.scope = new Promise((resolve, reject) =>
    //   setTimeout(() => {
    //     try {
    //       let window = iframe.contentWindow;
    //       let document = iframe.contentDocument;
    //       Object.defineProperty(window, 'scope', {
    //         get: () => this.scope,
    //         set: value => {
    //           window = document = script = null;
    //           resolve((this.scope = value));
    //         },
    //       });
    //       let script = iframe.contentDocument.createElement('script');
    //       script.textContent = 'scope = {... this}';
    //       document.body.appendChild(script);
    //     } catch (exception) {
    //       reject(exception);
    //     }
    //   }, 100),
    // );
    this.destroy = () => void (iframe.srcdoc = '');
    this.dispose = () => void (this.destroy(), dispose());
  }
}

Object.setPrototypeOf(BrowserContext.prototype, null);

// function BrowserContext(globals) {
//   BrowserContext =
//   return new.target ? new BrowserContext(...arguments) : BrowserContext(...arguments);
// }
