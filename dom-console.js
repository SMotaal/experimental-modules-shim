if (document.currentScript) {
  const {ELEMENT_NODE, TEXT_NODE} = document;

  const output = document.body.insertBefore(document.createElement('output'), document.currentScript);

  output.className = 'console';

  const Mark = (textContent, properties) => {
    let tag = 'span',
      className;
    properties && ({tag = tag, class: className = className, ...properties} = properties);
    return Object.assign(document.createElement(tag), {
      ...properties,
      className: `mark ${className || ''}`.trim(),
      textContent,
    });
  };

  const Break = () => Mark('\n', {class: 'break'});
  const Indent = () => Mark('\t', {class: 'indent'});
  const Comma = () => Mark(', ', {class: 'comma'});

  const Fragment = (...items) => {
    const fragment = document.createDocumentFragment();
    for (const item of items) fragment.appendChild(item);
    return fragment;
  };

  Fragment.each = (ƒ, ...items) => {
    const fragment = document.createDocumentFragment();
    for (const item of items) fragment.appendChild(ƒ(item));
    return fragment;
  };

  const Span = (...content) => {
    const span = document.createElement('span');
    content.length && span.append(...content);
    return span;
  };

  {
    for (const [name, fragment] of Object.entries({
      array: Fragment(Mark('[', {class: 'head'}), document.createElement('slot'), Mark(']')),
      object: Fragment(Mark('{', {class: 'head'}), document.createElement('slot'), Mark('}')),
      string: Fragment(Mark('"'), document.createElement('slot'), Mark('"')),
    })) {
      Fragment[name] = () => fragment.cloneNode(true);
    }
  }

  const Block = ({tag = 'pre', class: className, ...properties}) =>
    Object.assign(document.createElement(tag), {className, ...properties});

  {
    for (const [name, span] of Object.entries({
      'console.log': Block({class: 'console-log stdout'}),
      'console.warn': Block({class: 'console-warn stdout'}),
      'console.error': Block({class: 'console-error stderr'}),
      'console.info': Block({class: 'console-info stdout'}),
      'console.dir': Block({class: 'console-dir stdout'}),
      'console.trace': Block({class: 'console-trace stdout'}),
      'console.group': Block({class: 'console-group stdout'}),
      'console.groupCollapsed': Block({class: 'console-group-collapsed console-group stdout'}),
      'console.groupEnd': Block({class: 'console-group-end stdout', hidden: true}),
    })) {
      Block[name] = () => span.cloneNode(true);
    }
  }

  const noop = () => {};

  const timeout = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds || 0));

  const frame =
    (typeof requestAnimationFrame === 'function' && (() => new Promise(requestAnimationFrame))) ||
    (() => timeout(10));

  const idle =
    (typeof requestIdleCallback === 'function' && requestIdleCallback) ||
    ((execute, previous) => ƒ => void (previous = execute(ƒ, previous)))(
      async (ƒ, previous) => void (await frame(), await previous, await ƒ()),
    );

  const textify = item => {
    let type, body, kind;
    const element =
      ((type = item === null ? null : typeof item) === 'object' &&
        (('textContent' in item && item instanceof (kind = Element) && Span(item)) ||
          (item instanceof (kind = Error) &&
            Object.assign(Span(new Text(`${item}`)), {className: 'error', title: `${item.stack}`})) ||
          (item instanceof (kind = Array) && textify.array(item)) ||
          ((kind = undefined), Span(textify.object(item))))) ||
      (type === 'function' && Span(new Text(`${item}`))) ||
      Span(new Text(type !== 'symbol' ? `${item}` : ''));

    if (element && element.classList) {
      let className;

      if (type === 'object') {
        className = (Object.getPrototypeOf(item) || Object).constructor.name;
        kind && kind.name && (kind = kind.name);
        element.classList.add(`${className || kind}-object`);
      } else if (type === 'function') {
        className = Object.getPrototypeOf(item).constructor.name;
        type =
          className === 'GeneratorFunction'
            ? 'generator-function'
            : !Object.prototype.hasOwnProperty.call(item, 'prototype')
            ? 'arrow-function'
            : !item.prototype ||
              item.prototype.constructor !== item ||
              Object.getOwnPropertyDescriptor(item, 'prototype').writable
            ? 'function'
            : 'class';
        element.classList.add(`${className}-object`);
      }
      element.classList.add(`${type}-value`);
      className && element.setAttribute('data-class', className);
      kind && element.setAttribute('data-kind', kind);
      item == null || (type === 'object' && !element.classList.add());
    }
    return element;
  };

  textify.array = item => {
    const span = document.createElement('span');
    span.className = 'array-span';
    idle(() => {
      const name = (item.constructor || Array).name || 'Array';
      const content = item.length
        ? [].concat(...item.map((v, i) => [Indent(), Span(textify.array.item(v), Comma())]))
        : [];
      const root = span;
      root.append(Fragment.array());
      const slot = root.querySelector('slot:not([name])') || root.appendChild(document.createElement('slot'));
      const head = root.querySelector(':scope > .mark.head');
      !head || !name || head.prepend(new Text(`${name} `));
      content.length && (slot.append(Break(), ...content), span.classList.add('object-body'));
    });
    return span;
  };

  textify.array.item = textify;

  textify.object = item => {
    const span = document.createElement('span');
    span.className = 'object-span';
    idle(() => {
      const name = (item.constructor || Object).name || 'Object';
      const text = textify.json(item);
      const body = Span();
      let hasBody;
      if (item instanceof Promise) {
        hasBody = true;
        item.then(content => body.append(Span(new Text('<resolved> ')), textify(content)));
        item.catch(reason => body.append(Span(new Text('<rejected> ')), textify(reason)));
      }
      if (text.trim()) {
        hasBody = true;
        body.appendChild(new Text(text));
      }
      const content = hasBody ? [Indent(), body] : [];
      const root = span;
      root.append(Fragment.object());
      const slot = root.querySelector('slot:not([name])') || root.appendChild(document.createElement('slot'));
      const head = root.querySelector(':scope > .mark.head');
      !head || !name || head.prepend(new Text(`${name} `));
      content.length && (slot.append(Break(), ...content), span.classList.add('object-body'));
    });
    return span;
  };

  textify.json = (item, seen) => (
    (seen = new WeakSet([document.defaultView])),
    JSON.stringify(
      item,
      function(key, value) {
        if (value && 'object|function'.includes(typeof value)) {
          if (seen.has(value)) return;
          seen.add(value);
        }
        return value;
      },
      1,
    ).replace(/^\{\s*([^]*)\s*\}$/, (m, a) =>
      (a.includes('\n') ? a.replace(/\s*\n(\s?)\s*/g, '$1') : a).replace(/"([^\s\d]\S*)": /g, '$1: '),
    )
  );

  textify.format = args => {
    const body = document.createElement('span');
    let f;
    args.length > 1 &&
      args[0] &&
      typeof args[0] === 'string' &&
      textify.format.matcher.test(args[0]) &&
      ([f, args] = args);
    idle(() => body.append(textify.concat(...args)));
    return body;
  };

  textify.format.matcher = /(?:[^\\%]|^)%(?:c|d|f|o|O|s|\d+f|\d*\.\d+f)/g;

  textify.concat = (...items) => Fragment.each(textify, ...items);

  {
    const {dir, log, warn, error, info, group, groupCollapsed, groupEnd, trace} = console;

    let root = output;

    const append = (block, ...items) => {
      const element = block.appendChild(document.createElement('code'));
      element.append(...items);
      return root.appendChild(block);
    };

    class DOMConsole {
      log(...args) {
        append(Block['console.log'](), textify.format(args));
        return log(...args);
      }

      dir(...args) {
        append(Block['console.dir'](), textify.object(args[0]));
        return dir(...args);
      }

      warn(...args) {
        append(Block['console.warn'](), textify.format(args));
        return warn(...args);
      }

      error(...args) {
        append(Block['console.error'](), textify.format(args));
        return error(...args);
      }

      info(...args) {
        append(Block['console.info'](), textify.format(args));
        return info(...args);
      }

      trace(...args) {
        const stack = new Error('').stack
          .replace(/^.*\n.*?\n+/, '\n')
          .replace(/^(?:    |\t)?/gm, '\u2003\u2003\u2003\u2003');
        append(Block['console.trace'](), textify.concat('Trace:', ...args, stack));
        // log(`Trace:`, ...args, stack);
        return trace(...args);
      }

      group(...args) {
        root = append(Block['console.group'](), textify.format(args));
        return group(...args);
      }

      groupCollapsed(...args) {
        root = append(Block['console.groupCollapsed'](), textify.format(args));
        return groupCollapsed(...args);
      }

      groupEnd(...args) {
        append(Block['console.groupEnd']());
        root = root.parentElement;
        return groupEnd();
      }
    }

    ({
      dir: console.dir = dir,
      log: console.log = log,
      warn: console.warn = warn,
      error: console.error = error,
      info: console.info = info,
      group: console.group = group,
      groupEnd: console.groupEnd = groupEnd,
      groupCollapsed: console.groupCollapsed = groupCollapsed,
      trace: console.trace = trace,
    } = new DOMConsole());
  }
}
