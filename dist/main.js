
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
    'use strict';

    function noop() {}

    const identity = x => x;

    function assign(tar, src) {
    	for (const k in src) tar[k] = src[k];
    	return tar;
    }

    function add_location(element, file, line, column, char) {
    	element.__svelte_meta = {
    		loc: { file, line, column, char }
    	};
    }

    function run(fn) {
    	return fn();
    }

    function blank_object() {
    	return Object.create(null);
    }

    function run_all(fns) {
    	fns.forEach(run);
    }

    function is_function(thing) {
    	return typeof thing === 'function';
    }

    function safe_not_equal(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function validate_store(store, name) {
    	if (!store || typeof store.subscribe !== 'function') {
    		throw new Error(`'${name}' is not a store with a 'subscribe' method`);
    	}
    }

    function subscribe(component, store, callback) {
    	const unsub = store.subscribe(callback);

    	component.$$.on_destroy.push(unsub.unsubscribe
    		? () => unsub.unsubscribe()
    		: unsub);
    }

    function create_slot(definition, ctx, fn) {
    	if (definition) {
    		const slot_ctx = get_slot_context(definition, ctx, fn);
    		return definition[0](slot_ctx);
    	}
    }

    function get_slot_context(definition, ctx, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
    		: ctx.$$scope.ctx;
    }

    function get_slot_changes(definition, ctx, changed, fn) {
    	return definition[1]
    		? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
    		: ctx.$$scope.changed || {};
    }

    const tasks = new Set();
    let running = false;

    function run_tasks() {
    	tasks.forEach(task => {
    		if (!task[0](window.performance.now())) {
    			tasks.delete(task);
    			task[1]();
    		}
    	});

    	running = tasks.size > 0;
    	if (running) requestAnimationFrame(run_tasks);
    }

    function loop(fn) {
    	let task;

    	if (!running) {
    		running = true;
    		requestAnimationFrame(run_tasks);
    	}

    	return {
    		promise: new Promise(fulfil => {
    			tasks.add(task = [fn, fulfil]);
    		}),
    		abort() {
    			tasks.delete(task);
    		}
    	};
    }

    function append(target, node) {
    	target.appendChild(node);
    }

    function insert(target, node, anchor) {
    	target.insertBefore(node, anchor || null);
    }

    function detach(node) {
    	node.parentNode.removeChild(node);
    }

    function element(name) {
    	return document.createElement(name);
    }

    function svg_element(name) {
    	return document.createElementNS('http://www.w3.org/2000/svg', name);
    }

    function text(data) {
    	return document.createTextNode(data);
    }

    function space() {
    	return text(' ');
    }

    function listen(node, event, handler, options) {
    	node.addEventListener(event, handler, options);
    	return () => node.removeEventListener(event, handler, options);
    }

    function attr(node, attribute, value) {
    	if (value == null) node.removeAttribute(attribute);
    	else node.setAttribute(attribute, value);
    }

    function children(element) {
    	return Array.from(element.childNodes);
    }

    function set_data(text, data) {
    	data = '' + data;
    	if (text.data !== data) text.data = data;
    }

    function set_style(node, key, value) {
    	node.style.setProperty(key, value);
    }

    function custom_event(type, detail) {
    	const e = document.createEvent('CustomEvent');
    	e.initCustomEvent(type, false, false, detail);
    	return e;
    }

    let current_component;

    function set_current_component(component) {
    	current_component = component;
    }

    function get_current_component() {
    	if (!current_component) throw new Error(`Function called outside component initialization`);
    	return current_component;
    }

    function onMount(fn) {
    	get_current_component().$$.on_mount.push(fn);
    }

    function createEventDispatcher() {
    	const component = current_component;

    	return (type, detail) => {
    		const callbacks = component.$$.callbacks[type];

    		if (callbacks) {
    			// TODO are there situations where events could be dispatched
    			// in a server (non-DOM) environment?
    			const event = custom_event(type, detail);
    			callbacks.slice().forEach(fn => {
    				fn.call(component, event);
    			});
    		}
    	};
    }

    const dirty_components = [];

    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];

    function schedule_update() {
    	if (!update_scheduled) {
    		update_scheduled = true;
    		resolved_promise.then(flush);
    	}
    }

    function add_render_callback(fn) {
    	render_callbacks.push(fn);
    }

    function flush() {
    	const seen_callbacks = new Set();

    	do {
    		// first, call beforeUpdate functions
    		// and update components
    		while (dirty_components.length) {
    			const component = dirty_components.shift();
    			set_current_component(component);
    			update(component.$$);
    		}

    		while (binding_callbacks.length) binding_callbacks.shift()();

    		// then, once components are updated, call
    		// afterUpdate functions. This may cause
    		// subsequent updates...
    		while (render_callbacks.length) {
    			const callback = render_callbacks.pop();
    			if (!seen_callbacks.has(callback)) {
    				callback();

    				// ...so guard against infinite loops
    				seen_callbacks.add(callback);
    			}
    		}
    	} while (dirty_components.length);

    	while (flush_callbacks.length) {
    		flush_callbacks.pop()();
    	}

    	update_scheduled = false;
    }

    function update($$) {
    	if ($$.fragment) {
    		$$.update($$.dirty);
    		run_all($$.before_render);
    		$$.fragment.p($$.dirty, $$.ctx);
    		$$.dirty = null;

    		$$.after_render.forEach(add_render_callback);
    	}
    }

    function mount_component(component, target, anchor) {
    	const { fragment, on_mount, on_destroy, after_render } = component.$$;

    	fragment.m(target, anchor);

    	// onMount happens after the initial afterUpdate. Because
    	// afterUpdate callbacks happen in reverse order (inner first)
    	// we schedule onMount callbacks before afterUpdate callbacks
    	add_render_callback(() => {
    		const new_on_destroy = on_mount.map(run).filter(is_function);
    		if (on_destroy) {
    			on_destroy.push(...new_on_destroy);
    		} else {
    			// Edge case - component was destroyed immediately,
    			// most likely as a result of a binding initialising
    			run_all(new_on_destroy);
    		}
    		component.$$.on_mount = [];
    	});

    	after_render.forEach(add_render_callback);
    }

    function destroy(component, detaching) {
    	if (component.$$) {
    		run_all(component.$$.on_destroy);
    		component.$$.fragment.d(detaching);

    		// TODO null out other refs, including component.$$ (but need to
    		// preserve final state?)
    		component.$$.on_destroy = component.$$.fragment = null;
    		component.$$.ctx = {};
    	}
    }

    function make_dirty(component, key) {
    	if (!component.$$.dirty) {
    		dirty_components.push(component);
    		schedule_update();
    		component.$$.dirty = blank_object();
    	}
    	component.$$.dirty[key] = true;
    }

    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
    	const parent_component = current_component;
    	set_current_component(component);

    	const props = options.props || {};

    	const $$ = component.$$ = {
    		fragment: null,
    		ctx: null,

    		// state
    		props: prop_names,
    		update: noop,
    		not_equal: not_equal$$1,
    		bound: blank_object(),

    		// lifecycle
    		on_mount: [],
    		on_destroy: [],
    		before_render: [],
    		after_render: [],
    		context: new Map(parent_component ? parent_component.$$.context : []),

    		// everything else
    		callbacks: blank_object(),
    		dirty: null
    	};

    	let ready = false;

    	$$.ctx = instance
    		? instance(component, props, (key, value) => {
    			if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
    				if ($$.bound[key]) $$.bound[key](value);
    				if (ready) make_dirty(component, key);
    			}
    		})
    		: props;

    	$$.update();
    	ready = true;
    	run_all($$.before_render);
    	$$.fragment = create_fragment($$.ctx);

    	if (options.target) {
    		if (options.hydrate) {
    			$$.fragment.l(children(options.target));
    		} else {
    			$$.fragment.c();
    		}

    		if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
    		mount_component(component, options.target, options.anchor);
    		flush();
    	}

    	set_current_component(parent_component);
    }

    class SvelteComponent {
    	$destroy() {
    		destroy(this, true);
    		this.$destroy = noop;
    	}

    	$on(type, callback) {
    		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
    		callbacks.push(callback);

    		return () => {
    			const index = callbacks.indexOf(callback);
    			if (index !== -1) callbacks.splice(index, 1);
    		};
    	}

    	$set() {
    		// overridden by instance, if it has props
    	}
    }

    class SvelteComponentDev extends SvelteComponent {
    	constructor(options) {
    		if (!options || (!options.target && !options.$$inline)) {
    			throw new Error(`'target' is a required option`);
    		}

    		super();
    	}

    	$destroy() {
    		super.$destroy();
    		this.$destroy = () => {
    			console.warn(`Component was already destroyed`); // eslint-disable-line no-console
    		};
    	}
    }

    /* src\components\Router.svelte generated by Svelte v3.4.0 */

    /* src\components\SheetTest.svelte generated by Svelte v3.4.0 */

    function noop$1() {}

    function safe_not_equal$1(a, b) {
    	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function writable(value, start = noop$1) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal$1(value, new_value)) {
                value = new_value;
                if (!stop) {
                    return; // not ready
                }
                subscribers.forEach((s) => s[1]());
                subscribers.forEach((s) => s[0](value));
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe$$1(run$$1, invalidate = noop$1) {
            const subscriber = [run$$1, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop$1;
            }
            run$$1(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                }
            };
        }
        return { set, update, subscribe: subscribe$$1 };
    }

    /*
    Adapted from https://github.com/mattdesl
    Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
    */

    function cubicOut(t) {
    	const f = t - 1.0;
    	return f * f * f + 1.0;
    }

    function is_date(obj) {
    	return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
    	if (a === b || a !== a) return () => a;

    	const type = typeof a;

    	if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    		throw new Error('Cannot interpolate values of different type');
    	}

    	if (Array.isArray(a)) {
    		const arr = b.map((bi, i) => {
    			return get_interpolator(a[i], bi);
    		});

    		return t => arr.map(fn => fn(t));
    	}

    	if (type === 'object') {
    		if (!a || !b) throw new Error('Object cannot be null');

    		if (is_date(a) && is_date(b)) {
    			a = a.getTime();
    			b = b.getTime();
    			const delta = b - a;
    			return t => new Date(a + t * delta);
    		}

    		const keys = Object.keys(b);
    		const interpolators = {};

    		keys.forEach(key => {
    			interpolators[key] = get_interpolator(a[key], b[key]);
    		});

    		return t => {
    			const result = {};
    			keys.forEach(key => {
    				result[key] = interpolators[key](t);
    			});
    			return result;
    		};
    	}

    	if (type === 'number') {
    		const delta = b - a;
    		return t => a + t * delta;
    	}

    	throw new Error(`Cannot interpolate ${type} values`);
    }

    function tweened(value, defaults = {}) {
    	const store = writable(value);

    	let task;
    	let target_value = value;

    	function set(new_value, opts) {
    		target_value = new_value;

    		let previous_task = task;
    		let started = false;

    		let {
    			delay = 0,
    			duration = 400,
    			easing = identity,
    			interpolate = get_interpolator
    		} = assign(assign({}, defaults), opts);

    		const start = window.performance.now() + delay;
    		let fn;

    		task = loop(now => {
    			if (now < start) return true;

    			if (!started) {
    				fn = interpolate(value, new_value);
    				if (typeof duration === 'function') duration = duration(value, new_value);
    				started = true;
    			}

    			if (previous_task) {
    				previous_task.abort();
    				previous_task = null;
    			}

    			const elapsed = now - start;

    			if (elapsed > duration) {
    				store.set(value = new_value);
    				return false;
    			}

    			store.set(value = fn(easing(elapsed / duration)));
    			return true;
    		});

    		return task.promise;
    	}

    	return {
    		set,
    		update: (fn, opts) => set(fn(target_value, value), opts),
    		subscribe: store.subscribe
    	};
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */
    function toDate(argument) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * var result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    var MILLISECONDS_IN_MINUTE = 60000;
    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */

    function getTimezoneOffsetInMilliseconds(dirtyDate) {
      var date = new Date(dirtyDate.getTime());
      var baseTimezoneOffset = date.getTimezoneOffset();
      date.setSeconds(0, 0);
      var millisecondsPartOfTimezoneOffset = date.getTime() % MILLISECONDS_IN_MINUTE;
      return baseTimezoneOffset * MILLISECONDS_IN_MINUTE + millisecondsPartOfTimezoneOffset;
    }

    /**
     * @name isValid
     * @category Common Helpers
     * @summary Is the given date valid?
     *
     * @description
     * Returns false if argument is Invalid Date and true otherwise.
     * Argument is converted to Date using `toDate`. See [toDate]{@link https://date-fns.org/docs/toDate}
     * Invalid Date is a Date, whose time value is NaN.
     *
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Now `isValid` doesn't throw an exception
     *   if the first argument is not an instance of Date.
     *   Instead, argument is converted beforehand using `toDate`.
     *
     *   Examples:
     *
     *   | `isValid` argument        | Before v2.0.0 | v2.0.0 onward |
     *   |---------------------------|---------------|---------------|
     *   | `new Date()`              | `true`        | `true`        |
     *   | `new Date('2016-01-01')`  | `true`        | `true`        |
     *   | `new Date('')`            | `false`       | `false`       |
     *   | `new Date(1488370835081)` | `true`        | `true`        |
     *   | `new Date(NaN)`           | `false`       | `false`       |
     *   | `'2016-01-01'`            | `TypeError`   | `true`        |
     *   | `''`                      | `TypeError`   | `false`       |
     *   | `1488370835081`           | `TypeError`   | `true`        |
     *   | `NaN`                     | `TypeError`   | `false`       |
     *
     *   We introduce this change to make *date-fns* consistent with ECMAScript behavior
     *   that try to coerce arguments to the expected type
     *   (which is also the case with other *date-fns* functions).
     *
     * @param {*} date - the date to check
     * @returns {Boolean} the date is valid
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // For the valid date:
     * var result = isValid(new Date(2014, 1, 31))
     * //=> true
     *
     * @example
     * // For the value, convertable into a date:
     * var result = isValid(1393804800000)
     * //=> true
     *
     * @example
     * // For the invalid date:
     * var result = isValid(new Date(''))
     * //=> false
     */

    function isValid(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      return !isNaN(date);
    }

    /**
     * @name differenceInMilliseconds
     * @category Millisecond Helpers
     * @summary Get the number of milliseconds between the given dates.
     *
     * @description
     * Get the number of milliseconds between the given dates.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} dateLeft - the later date
     * @param {Date|Number} dateRight - the earlier date
     * @returns {Number} the number of milliseconds
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // How many milliseconds are between
     * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
     * var result = differenceInMilliseconds(
     *   new Date(2014, 6, 2, 12, 30, 21, 700),
     *   new Date(2014, 6, 2, 12, 30, 20, 600)
     * )
     * //=> 1100
     */

    function differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var dateLeft = toDate(dirtyDateLeft);
      var dateRight = toDate(dirtyDateRight);
      return dateLeft.getTime() - dateRight.getTime();
    }

    var MILLISECONDS_IN_MINUTE$1 = 60000;
    /**
     * @name differenceInMinutes
     * @category Minute Helpers
     * @summary Get the number of minutes between the given dates.
     *
     * @description
     * Get the number of minutes between the given dates.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} dateLeft - the later date
     * @param {Date|Number} dateRight - the earlier date
     * @returns {Number} the number of minutes
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // How many minutes are between 2 July 2014 12:07:59 and 2 July 2014 12:20:00?
     * var result = differenceInMinutes(
     *   new Date(2014, 6, 2, 12, 20, 0),
     *   new Date(2014, 6, 2, 12, 7, 59)
     * )
     * //=> 12
     */

    function differenceInMinutes(dirtyDateLeft, dirtyDateRight) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / MILLISECONDS_IN_MINUTE$1;
      return diff > 0 ? Math.floor(diff) : Math.ceil(diff);
    }

    /**
     * @name endOfTomorrow
     * @category Day Helpers
     * @summary Return the end of tomorrow.
     * @pure false
     *
     * @description
     * Return the end of tomorrow.
     *
     * > ⚠️ Please note that this function is not present in the FP submodule as
     * > it uses `Date.now()` internally hence impure and can't be safely curried.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @returns {Date} the end of tomorrow
     *
     * @example
     * // If today is 6 October 2014:
     * var result = endOfTomorrow()
     * //=> Tue Oct 7 2014 23:59:59.999
     */

    /**
     * @name endOfYesterday
     * @category Day Helpers
     * @summary Return the end of yesterday.
     * @pure false
     *
     * @description
     * Return the end of yesterday.
     *
     * > ⚠️ Please note that this function is not present in the FP submodule as
     * > it uses `Date.now()` internally hence impure and can't be safely curried.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @returns {Date} the end of yesterday
     *
     * @example
     * // If today is 6 October 2014:
     * var result = endOfYesterday()
     * //=> Sun Oct 5 2014 23:59:59.999
     */

    var formatDistanceLocale = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };
    function formatDistance(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale[token] === 'string') {
        result = formatDistanceLocale[token];
      } else if (count === 1) {
        result = formatDistanceLocale[token].one;
      } else {
        result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    }

    function buildFormatLongFn(args) {
      return function (dirtyOptions) {
        var options = dirtyOptions || {};
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };
    function formatRelative(token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    }

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
        return valuesArray[index];
      };
    }

    var eraValues = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'] // Note: in English, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    function ordinalNumber(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`:
      //
      //   var options = dirtyOptions || {}
      //   var unit = String(options.unit)
      //
      // where `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    }

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };

    function buildMatchPatternFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var matchResult = string.match(args.matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);

        if (!parseResult) {
          return null;
        }

        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function buildMatchFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var value;

        if (Object.prototype.toString.call(parsePatterns) === '[object Array]') {
          value = parsePatterns.findIndex(function (pattern) {
            return pattern.test(string);
          });
        } else {
          value = findKey(parsePatterns, function (pattern) {
            return pattern.test(string);
          });
        }

        value = args.valueCallback ? args.valueCallback(value) : value;
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }
    }

    var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern = /\d+/i;
    var matchEraPatterns = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */

    var locale = {
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * var result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    function addLeadingZeros(number, targetLength) {
      var sign = number < 0 ? '-' : '';
      var output = Math.abs(number).toString();

      while (output.length < targetLength) {
        output = '0' + output;
      }

      return sign + output;
    }

    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* |                                |
     * |  d  | Day of month                   |  D  |                                |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  m  | Minute                         |  M  | Month                          |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  y  | Year (abs)                     |  Y  |                                |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     */

    var formatters = {
      // Year
      y: function (date, token) {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_tokens
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var year = signedYear > 0 ? signedYear : 1 - signedYear;
        return addLeadingZeros(token === 'yy' ? year % 100 : year, token.length);
      },
      // Month
      M: function (date, token) {
        var month = date.getUTCMonth();
        return token === 'M' ? String(month + 1) : addLeadingZeros(month + 1, 2);
      },
      // Day of the month
      d: function (date, token) {
        return addLeadingZeros(date.getUTCDate(), token.length);
      },
      // AM or PM
      a: function (date, token) {
        var dayPeriodEnumValue = date.getUTCHours() / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return dayPeriodEnumValue.toUpperCase();

          case 'aaaaa':
            return dayPeriodEnumValue[0];

          case 'aaaa':
          default:
            return dayPeriodEnumValue === 'am' ? 'a.m.' : 'p.m.';
        }
      },
      // Hour [1-12]
      h: function (date, token) {
        return addLeadingZeros(date.getUTCHours() % 12 || 12, token.length);
      },
      // Hour [0-23]
      H: function (date, token) {
        return addLeadingZeros(date.getUTCHours(), token.length);
      },
      // Minute
      m: function (date, token) {
        return addLeadingZeros(date.getUTCMinutes(), token.length);
      },
      // Second
      s: function (date, token) {
        return addLeadingZeros(date.getUTCSeconds(), token.length);
      },
      // Fraction of second
      S: function (date, token) {
        var numberOfDigits = token.length;
        var milliseconds = date.getUTCMilliseconds();
        var fractionalSeconds = Math.floor(milliseconds * Math.pow(10, numberOfDigits - 3));
        return addLeadingZeros(fractionalSeconds, token.length);
      }
    };

    var MILLISECONDS_IN_DAY = 86400000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCDayOfYear(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      var timestamp = date.getTime();
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
      var startOfYearTimestamp = date.getTime();
      var difference = timestamp - startOfYearTimestamp;
      return Math.floor(difference / MILLISECONDS_IN_DAY) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      if (arguments.length < 1) {
        throw new TypeError('1 argument required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    var dayPeriodEnum = {
      am: 'am',
      pm: 'pm',
      midnight: 'midnight',
      noon: 'noon',
      morning: 'morning',
      afternoon: 'afternoon',
      evening: 'evening',
      night: 'night'
      /*
       * |     | Unit                           |     | Unit                           |
       * |-----|--------------------------------|-----|--------------------------------|
       * |  a  | AM, PM                         |  A* | Milliseconds in day            |
       * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
       * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
       * |  d  | Day of month                   |  D  | Day of year                    |
       * |  e  | Local day of week              |  E  | Day of week                    |
       * |  f  |                                |  F* | Day of week in month           |
       * |  g* | Modified Julian day            |  G  | Era                            |
       * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
       * |  i! | ISO day of week                |  I! | ISO week of year               |
       * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
       * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
       * |  l* | (deprecated)                   |  L  | Stand-alone month              |
       * |  m  | Minute                         |  M  | Month                          |
       * |  n  |                                |  N  |                                |
       * |  o! | Ordinal number modifier        |  O  | Timezone (GMT)                 |
       * |  p! | Long localized time            |  P! | Long localized date            |
       * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
       * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
       * |  s  | Second                         |  S  | Fraction of second             |
       * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
       * |  u  | Extended year                  |  U* | Cyclic year                    |
       * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
       * |  w  | Local week of year             |  W* | Week of month                  |
       * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
       * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
       * |  z  | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
       *
       * Letters marked by * are not implemented but reserved by Unicode standard.
       *
       * Letters marked by ! are non-standard, but implemented by date-fns:
       * - `o` modifies the previous token to turn it into an ordinal (see `format` docs)
       * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
       *   i.e. 7 for Sunday, 1 for Monday, etc.
       * - `I` is ISO week of year, as opposed to `w` which is local week of year.
       * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
       *   `R` is supposed to be used in conjunction with `I` and `i`
       *   for universal ISO week-numbering date, whereas
       *   `Y` is supposed to be used in conjunction with `w` and `e`
       *   for week-numbering date specific to the locale.
       * - `P` is long localized date format
       * - `p` is long localized time format
       */

    };
    var formatters$1 = {
      // Era
      G: function (date, token, localize) {
        var era = date.getUTCFullYear() > 0 ? 1 : 0;

        switch (token) {
          // AD, BC
          case 'G':
          case 'GG':
          case 'GGG':
            return localize.era(era, {
              width: 'abbreviated'
            });
          // A, B

          case 'GGGGG':
            return localize.era(era, {
              width: 'narrow'
            });
          // Anno Domini, Before Christ

          case 'GGGG':
          default:
            return localize.era(era, {
              width: 'wide'
            });
        }
      },
      // Year
      y: function (date, token, localize) {
        // Ordinal number
        if (token === 'yo') {
          var signedYear = date.getUTCFullYear(); // Returns 1 for 1 BC (which is year 0 in JavaScript)

          var year = signedYear > 0 ? signedYear : 1 - signedYear;
          return localize.ordinalNumber(year, {
            unit: 'year'
          });
        }

        return formatters.y(date, token);
      },
      // Local week-numbering year
      Y: function (date, token, localize, options) {
        var signedWeekYear = getUTCWeekYear(date, options); // Returns 1 for 1 BC (which is year 0 in JavaScript)

        var weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear; // Two digit year

        if (token === 'YY') {
          var twoDigitYear = weekYear % 100;
          return addLeadingZeros(twoDigitYear, 2);
        } // Ordinal number


        if (token === 'Yo') {
          return localize.ordinalNumber(weekYear, {
            unit: 'year'
          });
        } // Padding


        return addLeadingZeros(weekYear, token.length);
      },
      // ISO week-numbering year
      R: function (date, token) {
        var isoWeekYear = getUTCISOWeekYear(date); // Padding

        return addLeadingZeros(isoWeekYear, token.length);
      },
      // Extended year. This is a single number designating the year of this calendar system.
      // The main difference between `y` and `u` localizers are B.C. years:
      // | Year | `y` | `u` |
      // |------|-----|-----|
      // | AC 1 |   1 |   1 |
      // | BC 1 |   1 |   0 |
      // | BC 2 |   2 |  -1 |
      // Also `yy` always returns the last two digits of a year,
      // while `uu` pads single digit years to 2 characters and returns other years unchanged.
      u: function (date, token) {
        var year = date.getUTCFullYear();
        return addLeadingZeros(year, token.length);
      },
      // Quarter
      Q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'Q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'QQ':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'Qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'QQQ':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'QQQQQ':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'formatting'
            });
          // 1st quarter, 2nd quarter, ...

          case 'QQQQ':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone quarter
      q: function (date, token, localize) {
        var quarter = Math.ceil((date.getUTCMonth() + 1) / 3);

        switch (token) {
          // 1, 2, 3, 4
          case 'q':
            return String(quarter);
          // 01, 02, 03, 04

          case 'qq':
            return addLeadingZeros(quarter, 2);
          // 1st, 2nd, 3rd, 4th

          case 'qo':
            return localize.ordinalNumber(quarter, {
              unit: 'quarter'
            });
          // Q1, Q2, Q3, Q4

          case 'qqq':
            return localize.quarter(quarter, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // 1, 2, 3, 4 (narrow quarter; could be not numerical)

          case 'qqqqq':
            return localize.quarter(quarter, {
              width: 'narrow',
              context: 'standalone'
            });
          // 1st quarter, 2nd quarter, ...

          case 'qqqq':
          default:
            return localize.quarter(quarter, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Month
      M: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          case 'M':
          case 'MM':
            return formatters.M(date, token);
          // 1st, 2nd, ..., 12th

          case 'Mo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'MMM':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // J, F, ..., D

          case 'MMMMM':
            return localize.month(month, {
              width: 'narrow',
              context: 'formatting'
            });
          // January, February, ..., December

          case 'MMMM':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone month
      L: function (date, token, localize) {
        var month = date.getUTCMonth();

        switch (token) {
          // 1, 2, ..., 12
          case 'L':
            return String(month + 1);
          // 01, 02, ..., 12

          case 'LL':
            return addLeadingZeros(month + 1, 2);
          // 1st, 2nd, ..., 12th

          case 'Lo':
            return localize.ordinalNumber(month + 1, {
              unit: 'month'
            });
          // Jan, Feb, ..., Dec

          case 'LLL':
            return localize.month(month, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // J, F, ..., D

          case 'LLLLL':
            return localize.month(month, {
              width: 'narrow',
              context: 'standalone'
            });
          // January, February, ..., December

          case 'LLLL':
          default:
            return localize.month(month, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // Local week of year
      w: function (date, token, localize, options) {
        var week = getUTCWeek(date, options);

        if (token === 'wo') {
          return localize.ordinalNumber(week, {
            unit: 'week'
          });
        }

        return addLeadingZeros(week, token.length);
      },
      // ISO week of year
      I: function (date, token, localize) {
        var isoWeek = getUTCISOWeek(date);

        if (token === 'Io') {
          return localize.ordinalNumber(isoWeek, {
            unit: 'week'
          });
        }

        return addLeadingZeros(isoWeek, token.length);
      },
      // Day of the month
      d: function (date, token, localize) {
        if (token === 'do') {
          return localize.ordinalNumber(date.getUTCDate(), {
            unit: 'date'
          });
        }

        return formatters.d(date, token);
      },
      // Day of year
      D: function (date, token, localize) {
        var dayOfYear = getUTCDayOfYear(date);

        if (token === 'Do') {
          return localize.ordinalNumber(dayOfYear, {
            unit: 'dayOfYear'
          });
        }

        return addLeadingZeros(dayOfYear, token.length);
      },
      // Day of week
      E: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();

        switch (token) {
          // Tue
          case 'E':
          case 'EE':
          case 'EEE':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'EEEEE':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'EEEEEE':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'EEEE':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Local day of week
      e: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (Nth day of week with current locale or weekStartsOn)
          case 'e':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'ee':
            return addLeadingZeros(localDayOfWeek, 2);
          // 1st, 2nd, ..., 7th

          case 'eo':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'eee':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'eeeee':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'eeeeee':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'eeee':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Stand-alone local day of week
      c: function (date, token, localize, options) {
        var dayOfWeek = date.getUTCDay();
        var localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;

        switch (token) {
          // Numerical value (same as in `e`)
          case 'c':
            return String(localDayOfWeek);
          // Padded numerical value

          case 'cc':
            return addLeadingZeros(localDayOfWeek, token.length);
          // 1st, 2nd, ..., 7th

          case 'co':
            return localize.ordinalNumber(localDayOfWeek, {
              unit: 'day'
            });

          case 'ccc':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'standalone'
            });
          // T

          case 'ccccc':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'standalone'
            });
          // Tu

          case 'cccccc':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'standalone'
            });
          // Tuesday

          case 'cccc':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'standalone'
            });
        }
      },
      // ISO day of week
      i: function (date, token, localize) {
        var dayOfWeek = date.getUTCDay();
        var isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        switch (token) {
          // 2
          case 'i':
            return String(isoDayOfWeek);
          // 02

          case 'ii':
            return addLeadingZeros(isoDayOfWeek, token.length);
          // 2nd

          case 'io':
            return localize.ordinalNumber(isoDayOfWeek, {
              unit: 'day'
            });
          // Tue

          case 'iii':
            return localize.day(dayOfWeek, {
              width: 'abbreviated',
              context: 'formatting'
            });
          // T

          case 'iiiii':
            return localize.day(dayOfWeek, {
              width: 'narrow',
              context: 'formatting'
            });
          // Tu

          case 'iiiiii':
            return localize.day(dayOfWeek, {
              width: 'short',
              context: 'formatting'
            });
          // Tuesday

          case 'iiii':
          default:
            return localize.day(dayOfWeek, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM or PM
      a: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';

        switch (token) {
          case 'a':
          case 'aa':
          case 'aaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'aaaaa':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'aaaa':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // AM, PM, midnight, noon
      b: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours === 12) {
          dayPeriodEnumValue = dayPeriodEnum.noon;
        } else if (hours === 0) {
          dayPeriodEnumValue = dayPeriodEnum.midnight;
        } else {
          dayPeriodEnumValue = hours / 12 >= 1 ? 'pm' : 'am';
        }

        switch (token) {
          case 'b':
          case 'bb':
          case 'bbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'bbbbb':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'bbbb':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // in the morning, in the afternoon, in the evening, at night
      B: function (date, token, localize) {
        var hours = date.getUTCHours();
        var dayPeriodEnumValue;

        if (hours >= 17) {
          dayPeriodEnumValue = dayPeriodEnum.evening;
        } else if (hours >= 12) {
          dayPeriodEnumValue = dayPeriodEnum.afternoon;
        } else if (hours >= 4) {
          dayPeriodEnumValue = dayPeriodEnum.morning;
        } else {
          dayPeriodEnumValue = dayPeriodEnum.night;
        }

        switch (token) {
          case 'B':
          case 'BB':
          case 'BBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'abbreviated',
              context: 'formatting'
            });

          case 'BBBBB':
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'narrow',
              context: 'formatting'
            });

          case 'BBBB':
          default:
            return localize.dayPeriod(dayPeriodEnumValue, {
              width: 'wide',
              context: 'formatting'
            });
        }
      },
      // Hour [1-12]
      h: function (date, token, localize) {
        if (token === 'ho') {
          var hours = date.getUTCHours() % 12;
          if (hours === 0) hours = 12;
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return formatters.h(date, token);
      },
      // Hour [0-23]
      H: function (date, token, localize) {
        if (token === 'Ho') {
          return localize.ordinalNumber(date.getUTCHours(), {
            unit: 'hour'
          });
        }

        return formatters.H(date, token);
      },
      // Hour [0-11]
      K: function (date, token, localize) {
        var hours = date.getUTCHours() % 12;

        if (token === 'Ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Hour [1-24]
      k: function (date, token, localize) {
        var hours = date.getUTCHours();
        if (hours === 0) hours = 24;

        if (token === 'ko') {
          return localize.ordinalNumber(hours, {
            unit: 'hour'
          });
        }

        return addLeadingZeros(hours, token.length);
      },
      // Minute
      m: function (date, token, localize) {
        if (token === 'mo') {
          return localize.ordinalNumber(date.getUTCMinutes(), {
            unit: 'minute'
          });
        }

        return formatters.m(date, token);
      },
      // Second
      s: function (date, token, localize) {
        if (token === 'so') {
          return localize.ordinalNumber(date.getUTCSeconds(), {
            unit: 'second'
          });
        }

        return formatters.s(date, token);
      },
      // Fraction of second
      S: function (date, token) {
        return formatters.S(date, token);
      },
      // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
      X: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        if (timezoneOffset === 0) {
          return 'Z';
        }

        switch (token) {
          // Hours and optional minutes
          case 'X':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XX`

          case 'XXXX':
          case 'XX':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `XXX`

          case 'XXXXX':
          case 'XXX': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
      x: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Hours and optional minutes
          case 'x':
            return formatTimezoneWithOptionalMinutes(timezoneOffset);
          // Hours, minutes and optional seconds without `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xx`

          case 'xxxx':
          case 'xx':
            // Hours and minutes without `:` delimiter
            return formatTimezone(timezoneOffset);
          // Hours, minutes and optional seconds with `:` delimiter
          // Note: neither ISO-8601 nor JavaScript supports seconds in timezone offsets
          // so this token always has the same output as `xxx`

          case 'xxxxx':
          case 'xxx': // Hours and minutes with `:` delimiter

          default:
            return formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (GMT)
      O: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'O':
          case 'OO':
          case 'OOO':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'OOOO':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Timezone (specific non-location)
      z: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timezoneOffset = originalDate.getTimezoneOffset();

        switch (token) {
          // Short
          case 'z':
          case 'zz':
          case 'zzz':
            return 'GMT' + formatTimezoneShort(timezoneOffset, ':');
          // Long

          case 'zzzz':
          default:
            return 'GMT' + formatTimezone(timezoneOffset, ':');
        }
      },
      // Seconds timestamp
      t: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = Math.floor(originalDate.getTime() / 1000);
        return addLeadingZeros(timestamp, token.length);
      },
      // Milliseconds timestamp
      T: function (date, token, _localize, options) {
        var originalDate = options._originalDate || date;
        var timestamp = originalDate.getTime();
        return addLeadingZeros(timestamp, token.length);
      }
    };

    function formatTimezoneShort(offset, dirtyDelimiter) {
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = Math.floor(absOffset / 60);
      var minutes = absOffset % 60;

      if (minutes === 0) {
        return sign + String(hours);
      }

      var delimiter = dirtyDelimiter || '';
      return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
    }

    function formatTimezoneWithOptionalMinutes(offset, dirtyDelimiter) {
      if (offset % 60 === 0) {
        var sign = offset > 0 ? '-' : '+';
        return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
      }

      return formatTimezone(offset, dirtyDelimiter);
    }

    function formatTimezone(offset, dirtyDelimiter) {
      var delimiter = dirtyDelimiter || '';
      var sign = offset > 0 ? '-' : '+';
      var absOffset = Math.abs(offset);
      var hours = addLeadingZeros(Math.floor(absOffset / 60), 2);
      var minutes = addLeadingZeros(absOffset % 60, 2);
      return sign + hours + delimiter + minutes;
    }

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/);
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token) {
      if (token === 'YYYY') {
        throw new RangeError('Use `yyyy` instead of `YYYY` for formatting years; see: https://git.io/fxCyr');
      } else if (token === 'YY') {
        throw new RangeError('Use `yy` instead of `YY` for formatting years; see: https://git.io/fxCyr');
      } else if (token === 'D') {
        throw new RangeError('Use `d` instead of `D` for formatting days of the month; see: https://git.io/fxCyr');
      } else if (token === 'DD') {
        throw new RangeError('Use `dd` instead of `DD` for formatting days of the month; see: https://git.io/fxCyr');
      }
    }

    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'(.*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name format
     * @category Common Helpers
     * @summary Format the date.
     *
     * @description
     * Return the formatted date string in the given format. The result may vary by locale.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     * (see the last example)
     *
     * Format of the string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 7 below the table).
     *
     * Accepted patterns:
     * | Unit                            | Pattern | Result examples                   | Notes |
     * |---------------------------------|---------|-----------------------------------|-------|
     * | Era                             | G..GGG  | AD, BC                            |       |
     * |                                 | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 | GGGGG   | A, B                              |       |
     * | Calendar year                   | y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | yo      | 44th, 1st, 0th, 17th              | 5,7   |
     * |                                 | yy      | 44, 01, 00, 17                    | 5     |
     * |                                 | yyy     | 044, 001, 1900, 2017              | 5     |
     * |                                 | yyyy    | 0044, 0001, 1900, 2017            | 5     |
     * |                                 | yyyyy   | ...                               | 3,5   |
     * | Local week-numbering year       | Y       | 44, 1, 1900, 2017                 | 5     |
     * |                                 | Yo      | 44th, 1st, 1900th, 2017th         | 5,7   |
     * |                                 | YY      | 44, 01, 00, 17                    | 5,8   |
     * |                                 | YYY     | 044, 001, 1900, 2017              | 5     |
     * |                                 | YYYY    | 0044, 0001, 1900, 2017            | 5,8   |
     * |                                 | YYYYY   | ...                               | 3,5   |
     * | ISO week-numbering year         | R       | -43, 0, 1, 1900, 2017             | 5,7   |
     * |                                 | RR      | -43, 00, 01, 1900, 2017           | 5,7   |
     * |                                 | RRR     | -043, 000, 001, 1900, 2017        | 5,7   |
     * |                                 | RRRR    | -0043, 0000, 0001, 1900, 2017     | 5,7   |
     * |                                 | RRRRR   | ...                               | 3,5,7 |
     * | Extended year                   | u       | -43, 0, 1, 1900, 2017             | 5     |
     * |                                 | uu      | -43, 01, 1900, 2017               | 5     |
     * |                                 | uuu     | -043, 001, 1900, 2017             | 5     |
     * |                                 | uuuu    | -0043, 0001, 1900, 2017           | 5     |
     * |                                 | uuuuu   | ...                               | 3,5   |
     * | Quarter (formatting)            | Q       | 1, 2, 3, 4                        |       |
     * |                                 | Qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | QQ      | 01, 02, 03, 04                    |       |
     * |                                 | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | q       | 1, 2, 3, 4                        |       |
     * |                                 | qo      | 1st, 2nd, 3rd, 4th                | 7     |
     * |                                 | qq      | 01, 02, 03, 04                    |       |
     * |                                 | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 | qqqqq   | 1, 2, 3, 4                        | 4     |
     * | Month (formatting)              | M       | 1, 2, ..., 12                     |       |
     * |                                 | Mo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | MM      | 01, 02, ..., 12                   |       |
     * |                                 | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 | MMMM    | January, February, ..., December  | 2     |
     * |                                 | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | L       | 1, 2, ..., 12                     |       |
     * |                                 | Lo      | 1st, 2nd, ..., 12th               | 7     |
     * |                                 | LL      | 01, 02, ..., 12                   |       |
     * |                                 | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 | LLLL    | January, February, ..., December  | 2     |
     * |                                 | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | w       | 1, 2, ..., 53                     |       |
     * |                                 | wo      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | I       | 1, 2, ..., 53                     | 7     |
     * |                                 | Io      | 1st, 2nd, ..., 53th               | 7     |
     * |                                 | II      | 01, 02, ..., 53                   | 7     |
     * | Day of month                    | d       | 1, 2, ..., 31                     |       |
     * |                                 | do      | 1st, 2nd, ..., 31st               | 7     |
     * |                                 | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     | D       | 1, 2, ..., 365, 366               | 9     |
     * |                                 | Do      | 1st, 2nd, ..., 365th, 366th       | 7     |
     * |                                 | DD      | 01, 02, ..., 365, 366             | 9     |
     * |                                 | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 | DDDD    | ...                               | 3     |
     * | Day of week (formatting)        | E..EEE  | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    | i       | 1, 2, 3, ..., 7                   | 7     |
     * |                                 | io      | 1st, 2nd, ..., 7th                | 7     |
     * |                                 | ii      | 01, 02, ..., 07                   | 7     |
     * |                                 | iii     | Mon, Tue, Wed, ..., Su            | 7     |
     * |                                 | iiii    | Monday, Tuesday, ..., Sunday      | 2,7   |
     * |                                 | iiiii   | M, T, W, T, F, S, S               | 7     |
     * |                                 | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 7     |
     * | Local day of week (formatting)  | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 | eo      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | ee      | 02, 03, ..., 01                   |       |
     * |                                 | eee     | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 | co      | 2nd, 3rd, ..., 1st                | 7     |
     * |                                 | cc      | 02, 03, ..., 01                   |       |
     * |                                 | ccc     | Mon, Tue, Wed, ..., Su            |       |
     * |                                 | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          | a..aaa  | AM, PM                            |       |
     * |                                 | aaaa    | a.m., p.m.                        | 2     |
     * |                                 | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          | b..bbb  | AM, PM, noon, midnight            |       |
     * |                                 | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             | B..BBB  | at night, in the morning, ...     |       |
     * |                                 | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 | ho      | 1st, 2nd, ..., 11th, 12th         | 7     |
     * |                                 | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 | Ho      | 0th, 1st, 2nd, ..., 23rd          | 7     |
     * |                                 | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 | Ko      | 1st, 2nd, ..., 11th, 0th          | 7     |
     * |                                 | KK      | 1, 2, ..., 11, 0                  |       |
     * | Hour [1-24]                     | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 | ko      | 24th, 1st, 2nd, ..., 23rd         | 7     |
     * |                                 | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          | m       | 0, 1, ..., 59                     |       |
     * |                                 | mo      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | mm      | 00, 01, ..., 59                   |       |
     * | Second                          | s       | 0, 1, ..., 59                     |       |
     * |                                 | so      | 0th, 1st, ..., 59th               | 7     |
     * |                                 | ss      | 00, 01, ..., 59                   |       |
     * | Fraction of second              | S       | 0, 1, ..., 9                      |       |
     * |                                 | SS      | 00, 01, ..., 99                   |       |
     * |                                 | SSS     | 000, 0001, ..., 999               |       |
     * |                                 | SSSS    | ...                               | 3     |
     * | Timezone (ISO-8601 w/ Z)        | X       | -08, +0530, Z                     |       |
     * |                                 | XX      | -0800, +0530, Z                   |       |
     * |                                 | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       | x       | -08, +0530, +00                   |       |
     * |                                 | xx      | -0800, +0530, +0000               |       |
     * |                                 | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Timezone (GMT)                  | O...OOO | GMT-8, GMT+5:30, GMT+0            |       |
     * |                                 | OOOO    | GMT-08:00, GMT+05:30, GMT+00:00   | 2     |
     * | Timezone (specific non-locat.)  | z...zzz | GMT-8, GMT+5:30, GMT+0            | 6     |
     * |                                 | zzzz    | GMT-08:00, GMT+05:30, GMT+00:00   | 2,6   |
     * | Seconds timestamp               | t       | 512969520                         | 7     |
     * |                                 | tt      | ...                               | 3,7   |
     * | Milliseconds timestamp          | T       | 512969520900                      | 7     |
     * |                                 | TT      | ...                               | 3,7   |
     * | Long localized date             | P       | 05/29/1453                        | 7     |
     * |                                 | PP      | May 29, 1453                      | 7     |
     * |                                 | PPP     | May 29th, 1453                    | 7     |
     * |                                 | PPPP    | Sunday, May 29th, 1453            | 2,7   |
     * | Long localized time             | p       | 12:00 AM                          | 7     |
     * |                                 | pp      | 12:00:00 AM                       | 7     |
     * |                                 | ppp     | 12:00:00 AM GMT+2                 | 7     |
     * |                                 | pppp    | 12:00:00 AM GMT+02:00             | 2,7   |
     * | Combination of date and time    | Pp      | 05/29/1453, 12:00 AM              | 7     |
     * |                                 | PPpp    | May 29, 1453, 12:00:00 AM         | 7     |
     * |                                 | PPPppp  | May 29th, 1453 at ...             | 7     |
     * |                                 | PPPPpppp| Sunday, May 29th, 1453 at ...     | 2,7   |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table (e.g. `EEEEEEEEEEE`)
     *    the output will be the same as default pattern for this unit, usually
     *    the longest one (in case of ISO weekdays, `EEEE`). Default patterns for units
     *    are marked with "2" in the last column of the table.
     *
     *    `format(new Date(2017, 10, 6), 'MMM') //=> 'Nov'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMM') //=> 'N'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMM') //=> 'November'`
     *
     *    `format(new Date(2017, 10, 6), 'MMMMMMM') //=> 'November'`
     *
     * 3. Some patterns could be unlimited length (such as `yyyyyyyy`).
     *    The output will be padded with zeros to match the length of the pattern.
     *
     *    `format(new Date(2017, 10, 6), 'yyyyyyyy') //=> '00002017'`
     *
     * 4. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 5. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` always returns the last two digits of a year,
     *    while `uu` pads single digit years to 2 characters and returns other years unchanged:
     *
     *    | Year | `yy` | `uu` |
     *    |------|------|------|
     *    | 1    |   01 |   01 |
     *    | 14   |   14 |   14 |
     *    | 376  |   76 |  376 |
     *    | 1453 |   53 | 1453 |
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [getISOWeekYear]{@link https://date-fns.org/docs/getISOWeekYear}
     *    and [getWeekYear]{@link https://date-fns.org/docs/getWeekYear}).
     *
     * 6. Specific non-location timezones are currently unavailable in `date-fns`,
     *    so right now these tokens fall back to GMT timezones.
     *
     * 7. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `t`: seconds timestamp
     *    - `T`: milliseconds timestamp
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 8. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 9. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - The second argument is now required for the sake of explicitness.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   format(new Date(2016, 0, 1))
     *
     *   // v2.0.0 onward
     *   format(new Date(2016, 0, 1), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
     *   ```
     *
     * - New format string API for `format` function
     *   which is based on [Unicode Technical Standard #35](https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table).
     *   See [this post](https://blog.date-fns.org/post/unicode-tokens-in-date-fns-v2-sreatyki91jg) for more details.
     *
     * - Characters are now escaped using single quote symbols (`'`) instead of square brackets.
     *
     * @param {Date|Number} date - the original date
     * @param {String} format - the string of tokens
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {Number} [options.firstWeekContainsDate=1] - the day of January, which is
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {String} the formatted date string
     * @throws {TypeError} 2 arguments required
     * @throws {RangeError} `options.locale` must contain `localize` property
     * @throws {RangeError} `options.locale` must contain `formatLong` property
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Represent 11 February 2014 in middle-endian format:
     * var result = format(new Date(2014, 1, 11), 'MM/dd/yyyy')
     * //=> '02/11/2014'
     *
     * @example
     * // Represent 2 July 2014 in Esperanto:
     * import { eoLocale } from 'date-fns/locale/eo'
     * var result = format(new Date(2014, 6, 2), "do 'de' MMMM yyyy", {
     *   locale: eoLocale
     * })
     * //=> '2-a de julio 2014'
     *
     * @example
     * // Escape string by single quote characters:
     * var result = format(new Date(2014, 6, 2, 15), "h 'o''clock'")
     * //=> "3 o'clock"
     */

    function format(dirtyDate, dirtyFormatStr, dirtyOptions) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var formatStr = String(dirtyFormatStr);
      var options = dirtyOptions || {};
      var locale$1 = options.locale || locale;
      var localeFirstWeekContainsDate = locale$1.options && locale$1.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale$1.options && locale$1.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (!locale$1.localize) {
        throw new RangeError('locale must contain localize property');
      }

      if (!locale$1.formatLong) {
        throw new RangeError('locale must contain formatLong property');
      }

      var originalDate = toDate(dirtyDate);

      if (!isValid(originalDate)) {
        throw new RangeError('Invalid time value');
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/376


      var timezoneOffset = getTimezoneOffsetInMilliseconds(originalDate);
      var utcDate = subMilliseconds(originalDate, timezoneOffset);
      var formatterOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale$1,
        _originalDate: originalDate
      };
      var result = formatStr.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale$1.formatLong, formatterOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp).map(function (substring) {
        // Replace two single quote characters with one single quote character
        if (substring === "''") {
          return "'";
        }

        var firstCharacter = substring[0];

        if (firstCharacter === "'") {
          return cleanEscapedString(substring);
        }

        var formatter = formatters$1[firstCharacter];

        if (formatter) {
          if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(substring)) {
            throwProtectedError(substring);
          }

          if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(substring)) {
            throwProtectedError(substring);
          }

          return formatter(utcDate, substring, locale$1.localize, formatterOptions);
        }

        if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
          throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
        }

        return substring;
      }).join('');
      return result;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    /**
     * @name isAfter
     * @category Common Helpers
     * @summary Is the first date after the second one?
     *
     * @description
     * Is the first date after the second one?
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date that should be after the other one to return true
     * @param {Date|Number} dateToCompare - the date to compare with
     * @returns {Boolean} the first date is after the second date
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Is 10 July 1989 after 11 February 1987?
     * var result = isAfter(new Date(1989, 6, 10), new Date(1987, 1, 11))
     * //=> true
     */

    function isAfter(dirtyDate, dirtyDateToCompare) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var date = toDate(dirtyDate);
      var dateToCompare = toDate(dirtyDateToCompare);
      return date.getTime() > dateToCompare.getTime();
    }

    /**
     * @name isDate
     * @category Common Helpers
     * @summary Is the given value a date?
     *
     * @description
     * Returns true if the given value is an instance of Date. The function works for dates transferred across iframes.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {*} value - the value to check
     * @returns {boolean} true if the given value is a date
     * @throws {TypeError} 1 arguments required
     *
     * @example
     * // For a valid date:
     * var result = isDate(new Date())
     * //=> true
     *
     * @example
     * // For an invalid date:
     * var result = isDate(new Date(NaN))
     * //=> true
     *
     * @example
     * // For some value:
     * var result = isDate('2014-02-31')
     * //=> false
     *
     * @example
     * // For an object:
     * var result = isDate({})
     * //=> false
     */

    /**
     * @name isEqual
     * @category Common Helpers
     * @summary Are the given dates equal?
     *
     * @description
     * Are the given dates equal?
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} dateLeft - the first date to compare
     * @param {Date|Number} dateRight - the second date to compare
     * @returns {Boolean} the dates are equal
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Are 2 July 2014 06:30:45.000 and 2 July 2014 06:30:45.500 equal?
     * var result = isEqual(
     *   new Date(2014, 6, 2, 6, 30, 45, 0),
     *   new Date(2014, 6, 2, 6, 30, 45, 500)
     * )
     * //=> false
     */

    function isEqual(dirtyLeftDate, dirtyRightDate) {
      if (arguments.length < 2) {
        throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
      }

      var dateLeft = toDate(dirtyLeftDate);
      var dateRight = toDate(dirtyRightDate);
      return dateLeft.getTime() === dateRight.getTime();
    }

    /**
     * @name startOfTomorrow
     * @category Day Helpers
     * @summary Return the start of tomorrow.
     * @pure false
     *
     * @description
     * Return the start of tomorrow.
     *
     * > ⚠️ Please note that this function is not present in the FP submodule as
     * > it uses `Date.now()` internally hence impure and can't be safely curried.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @returns {Date} the start of tomorrow
     *
     * @example
     * // If today is 6 October 2014:
     * var result = startOfTomorrow()
     * //=> Tue Oct 7 2014 00:00:00
     */

    /**
     * @name startOfYesterday
     * @category Day Helpers
     * @summary Return the start of yesterday.
     * @pure false
     *
     * @description
     * Return the start of yesterday.
     *
     * > ⚠️ Please note that this function is not present in the FP submodule as
     * > it uses `Date.now()` internally hence impure and can't be safely curried.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @returns {Date} the start of yesterday
     *
     * @example
     * // If today is 6 October 2014:
     * var result = startOfYesterday()
     * //=> Sun Oct 5 2014 00:00:00
     */

    /**
     *  Maximum allowed time.
     *  @constant
     *  @type {number}
     *  @default
     */

    // This file is generated automatically by `scripts/build/indices.js`. Please, don't change it.

    //Signed in user info
    const userName = writable();

    //gapi instance
    const gapiInstance = writable();

    //ui flags
    const showEntry = writable(true);
    const showSummary = writable(false);
    const showSettings = writable(false);

    const credentials = {
      CLIENT_ID:
        "634914729787-buqfp7mh76bjh7bghe50tja5dlojkta8.apps.googleusercontent.com",
      API_KEY: "AIzaSyAGjmUfhPFXGnB6RE4FyetygrlsUnAO6mc",
      SCOPES: "https://www.googleapis.com/auth/spreadsheets",
      DISCOVERY_DOCS: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
      SHEET_ID: "1XcXToo9F79vB-YoooATQhAY8Kb57uSpEEWdMa8gJSRw"
    };

    /* src\components\EntryBlock.svelte generated by Svelte v3.4.0 */

    const file = "src\\components\\EntryBlock.svelte";

    function create_fragment(ctx) {
    	var div, h1, t0, t1, body, input0, input0_class_value, t2, input1, input1_class_value, t3, div_class_value, current, dispose;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(ctx.title);
    			t1 = space();
    			body = element("body");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();

    			if (default_slot) default_slot.c();
    			input0.className = input0_class_value = "input " + (ctx.check ? 'input-ok' : 'input-error') + " svelte-g62c24";
    			attr(input0, "type", "date");
    			input0.min = ctx.minDate;
    			add_location(input0, file, 27, 6, 850);
    			input1.className = input1_class_value = "input " + (ctx.check ? 'input-ok' : 'input-error') + " svelte-g62c24";
    			attr(input1, "type", "time");
    			add_location(input1, file, 35, 6, 1124);
    			add_location(body, file, 26, 4, 836);
    			add_location(h1, file, 24, 2, 813);

    			div.className = div_class_value = "background p-4 " + (ctx.isFocused ? 'background-selected' : '') + " svelte-g62c24";
    			add_location(div, file, 23, 0, 740);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input0, "focus", ctx.focus_handler),
    				listen(input0, "blur", ctx.blur_handler),
    				listen(input0, "change", ctx.dispatchValues),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input1, "focus", ctx.focus_handler_1),
    				listen(input1, "blur", ctx.blur_handler_1),
    				listen(input1, "change", ctx.dispatchValues)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, body);
    			append(body, input0);

    			input0.value = ctx.date;

    			append(body, t2);
    			append(body, input1);

    			input1.value = ctx.time;

    			append(div, t3);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.title) {
    				set_data(t0, ctx.title);
    			}

    			if (changed.date) input0.value = ctx.date;

    			if ((!current || changed.check) && input0_class_value !== (input0_class_value = "input " + (ctx.check ? 'input-ok' : 'input-error') + " svelte-g62c24")) {
    				input0.className = input0_class_value;
    			}

    			if (!current || changed.minDate) {
    				input0.min = ctx.minDate;
    			}

    			if (changed.time) input1.value = ctx.time;

    			if ((!current || changed.check) && input1_class_value !== (input1_class_value = "input " + (ctx.check ? 'input-ok' : 'input-error') + " svelte-g62c24")) {
    				input1.className = input1_class_value;
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			if ((!current || changed.isFocused) && div_class_value !== (div_class_value = "background p-4 " + (ctx.isFocused ? 'background-selected' : '') + " svelte-g62c24")) {
    				div.className = div_class_value;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { date, time, title, check = true, minDate } = $$props;

      let isFocused = false;

      const dispatch = createEventDispatcher();

      function dispatchValues() {
        dispatch(title.replace(/\s+/g, "").toLowerCase(), {
          date: date,
          time: time
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	function input0_input_handler() {
    		date = this.value;
    		$$invalidate('date', date);
    	}

    	function focus_handler() {
    		const $$result = (isFocused = true);
    		$$invalidate('isFocused', isFocused);
    		return $$result;
    	}

    	function blur_handler() {
    		const $$result = (isFocused = false);
    		$$invalidate('isFocused', isFocused);
    		return $$result;
    	}

    	function input1_input_handler() {
    		time = this.value;
    		$$invalidate('time', time);
    	}

    	function focus_handler_1() {
    		const $$result = (isFocused = true);
    		$$invalidate('isFocused', isFocused);
    		return $$result;
    	}

    	function blur_handler_1() {
    		const $$result = (isFocused = false);
    		$$invalidate('isFocused', isFocused);
    		return $$result;
    	}

    	$$self.$set = $$props => {
    		if ('date' in $$props) $$invalidate('date', date = $$props.date);
    		if ('time' in $$props) $$invalidate('time', time = $$props.time);
    		if ('title' in $$props) $$invalidate('title', title = $$props.title);
    		if ('check' in $$props) $$invalidate('check', check = $$props.check);
    		if ('minDate' in $$props) $$invalidate('minDate', minDate = $$props.minDate);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return {
    		date,
    		time,
    		title,
    		check,
    		minDate,
    		isFocused,
    		dispatchValues,
    		input0_input_handler,
    		focus_handler,
    		blur_handler,
    		input1_input_handler,
    		focus_handler_1,
    		blur_handler_1,
    		$$slots,
    		$$scope
    	};
    }

    class EntryBlock extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["date", "time", "title", "check", "minDate"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.date === undefined && !('date' in props)) {
    			console.warn("<EntryBlock> was created without expected prop 'date'");
    		}
    		if (ctx.time === undefined && !('time' in props)) {
    			console.warn("<EntryBlock> was created without expected prop 'time'");
    		}
    		if (ctx.title === undefined && !('title' in props)) {
    			console.warn("<EntryBlock> was created without expected prop 'title'");
    		}
    		if (ctx.minDate === undefined && !('minDate' in props)) {
    			console.warn("<EntryBlock> was created without expected prop 'minDate'");
    		}
    	}

    	get date() {
    		throw new Error("<EntryBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set date(value) {
    		throw new Error("<EntryBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get time() {
    		throw new Error("<EntryBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set time(value) {
    		throw new Error("<EntryBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<EntryBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<EntryBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get check() {
    		throw new Error("<EntryBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set check(value) {
    		throw new Error("<EntryBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get minDate() {
    		throw new Error("<EntryBlock>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set minDate(value) {
    		throw new Error("<EntryBlock>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Entry.svelte generated by Svelte v3.4.0 */

    const file$1 = "src\\components\\Entry.svelte";

    // (298:0) <EntryBlock    title="Picked up at"    date={pickUpDate}    time={pickUpTime}    check={check4v3}    minDate={wakeDate}    on:pickedupat={receivePickedUp}>
    function create_default_slot(ctx) {
    	var div, button, t, button_class_value, dispose;

    	return {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = text("Submit");
    			button.className = button_class_value = "py-2 w-1/2 my-12 rounded-lg bg-accentColor2 text-white text-2xl\r\n      font-bold hover:shadow-lg border-b-4 border-teal-700 " + (ctx.check2v1 && ctx.check3v2 && ctx.check4v3 ? '' : 'opacity-50');
    			add_location(button, file$1, 305, 4, 8182);
    			div.className = "flex items-center justify-center";
    			add_location(div, file$1, 304, 2, 8130);
    			dispose = listen(button, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    			append(button, t);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.check2v1 || changed.check3v2 || changed.check4v3) && button_class_value !== (button_class_value = "py-2 w-1/2 my-12 rounded-lg bg-accentColor2 text-white text-2xl\r\n      font-bold hover:shadow-lg border-b-4 border-teal-700 " + (ctx.check2v1 && ctx.check3v2 && ctx.check4v3 ? '' : 'opacity-50'))) {
    				button.className = button_class_value;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var t0, t1, div1, body, t2, div0, t3, t4, t5_value = ctx.elapsedSleepTime === 1 ? 'minute' : 'minutes', t5, t6, t7, current;

    	var entryblock0 = new EntryBlock({
    		props: {
    		title: "Put down at",
    		date: ctx.putDownDate,
    		time: ctx.putDownTime
    	},
    		$$inline: true
    	});
    	entryblock0.$on("putdownat", ctx.receivePutDown);

    	var entryblock1 = new EntryBlock({
    		props: {
    		title: "Fell asleep at",
    		date: ctx.sleepDate,
    		time: ctx.sleepTime,
    		check: ctx.check2v1,
    		minDate: ctx.putDownDate
    	},
    		$$inline: true
    	});
    	entryblock1.$on("fellasleepat", ctx.receiveFellAsleep);

    	var entryblock2 = new EntryBlock({
    		props: {
    		title: "Woke up at",
    		date: ctx.wakeDate,
    		time: ctx.wakeTime,
    		check: ctx.check3v2,
    		minDate: ctx.sleepDate
    	},
    		$$inline: true
    	});
    	entryblock2.$on("wokeupat", ctx.receiveWokeUp);

    	var entryblock3 = new EntryBlock({
    		props: {
    		title: "Picked up at",
    		date: ctx.pickUpDate,
    		time: ctx.pickUpTime,
    		check: ctx.check4v3,
    		minDate: ctx.wakeDate,
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	entryblock3.$on("pickedupat", ctx.receivePickedUp);

    	return {
    		c: function create() {
    			entryblock0.$$.fragment.c();
    			t0 = space();
    			entryblock1.$$.fragment.c();
    			t1 = space();
    			div1 = element("div");
    			body = element("body");
    			t2 = text("Asleep for\r\n    ");
    			div0 = element("div");
    			t3 = text(ctx.elapsedSleepTime);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			entryblock2.$$.fragment.c();
    			t7 = space();
    			entryblock3.$$.fragment.c();
    			div0.className = "inline-block mx-2 px-2 py-1 rounded-full w-auto text-center\r\n      bg-secondaryColor font-bold";
    			add_location(div0, file$1, 282, 4, 7594);
    			body.className = "text-2xl justify-center items-center flex";
    			add_location(body, file$1, 280, 2, 7516);
    			div1.className = "w-full overflow-hidden bg-accentColor3";
    			set_style(div1, "height", "" + ctx.$elapsedSleepTimeDivHeight + "rem");
    			add_location(div1, file$1, 277, 0, 7406);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(entryblock0, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(entryblock1, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, div1, anchor);
    			append(div1, body);
    			append(body, t2);
    			append(body, div0);
    			append(div0, t3);
    			append(body, t4);
    			append(body, t5);
    			insert(target, t6, anchor);
    			mount_component(entryblock2, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(entryblock3, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var entryblock0_changes = {};
    			if (changed.putDownDate) entryblock0_changes.date = ctx.putDownDate;
    			if (changed.putDownTime) entryblock0_changes.time = ctx.putDownTime;
    			entryblock0.$set(entryblock0_changes);

    			var entryblock1_changes = {};
    			if (changed.sleepDate) entryblock1_changes.date = ctx.sleepDate;
    			if (changed.sleepTime) entryblock1_changes.time = ctx.sleepTime;
    			if (changed.check2v1) entryblock1_changes.check = ctx.check2v1;
    			if (changed.putDownDate) entryblock1_changes.minDate = ctx.putDownDate;
    			entryblock1.$set(entryblock1_changes);

    			if (!current || changed.elapsedSleepTime) {
    				set_data(t3, ctx.elapsedSleepTime);
    			}

    			if ((!current || changed.elapsedSleepTime) && t5_value !== (t5_value = ctx.elapsedSleepTime === 1 ? 'minute' : 'minutes')) {
    				set_data(t5, t5_value);
    			}

    			if (!current || changed.$elapsedSleepTimeDivHeight) {
    				set_style(div1, "height", "" + ctx.$elapsedSleepTimeDivHeight + "rem");
    			}

    			var entryblock2_changes = {};
    			if (changed.wakeDate) entryblock2_changes.date = ctx.wakeDate;
    			if (changed.wakeTime) entryblock2_changes.time = ctx.wakeTime;
    			if (changed.check3v2) entryblock2_changes.check = ctx.check3v2;
    			if (changed.sleepDate) entryblock2_changes.minDate = ctx.sleepDate;
    			entryblock2.$set(entryblock2_changes);

    			var entryblock3_changes = {};
    			if (changed.pickUpDate) entryblock3_changes.date = ctx.pickUpDate;
    			if (changed.pickUpTime) entryblock3_changes.time = ctx.pickUpTime;
    			if (changed.check4v3) entryblock3_changes.check = ctx.check4v3;
    			if (changed.wakeDate) entryblock3_changes.minDate = ctx.wakeDate;
    			if (changed.$$scope || changed.check2v1 || changed.check3v2 || changed.check4v3) entryblock3_changes.$$scope = { changed, ctx };
    			entryblock3.$set(entryblock3_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			entryblock0.$$.fragment.i(local);

    			entryblock1.$$.fragment.i(local);

    			entryblock2.$$.fragment.i(local);

    			entryblock3.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			entryblock0.$$.fragment.o(local);
    			entryblock1.$$.fragment.o(local);
    			entryblock2.$$.fragment.o(local);
    			entryblock3.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			entryblock0.$destroy(detaching);

    			if (detaching) {
    				detach(t0);
    			}

    			entryblock1.$destroy(detaching);

    			if (detaching) {
    				detach(t1);
    				detach(div1);
    				detach(t6);
    			}

    			entryblock2.$destroy(detaching);

    			if (detaching) {
    				detach(t7);
    			}

    			entryblock3.$destroy(detaching);
    		}
    	};
    }

    function signIn() {
      gapi.auth2
        .getAuthInstance()
        .signIn()
        .then(response => {
          if (response.El.length > 0) {
            gapiInstance.set(gapi);
            userName.set(
              gapi.auth2
                .getAuthInstance()
                .currentUser.get()
                .getBasicProfile()
                .getName()
            );
            userName.set(
              gapi.auth2
                .getAuthInstance()
                .currentUser.get()
                .getBasicProfile()
                .getImageUrl()
            );
          } else {
            console.log("Failed to sign in");
          }
        });
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $gapiInstance, $elapsedSleepTimeDivHeight, $userName;

    	validate_store(gapiInstance, 'gapiInstance');
    	subscribe($$self, gapiInstance, $$value => { $gapiInstance = $$value; $$invalidate('$gapiInstance', $gapiInstance); });
    	validate_store(userName, 'userName');
    	subscribe($$self, userName, $$value => { $userName = $$value; $$invalidate('$userName', $userName); });

    	

      let putDownDate = format(new Date(), "yyyy-MM-dd");
      let putDownTime = format(new Date(), "HH:mm");
      let sleepDate,
        sleepTime,
        wakeDate,
        wakeTime,
        pickUpDate,
        pickUpTime,
        elapsedSleepTime;

      /**
       * Validation checks to verify if the inputted date time is after the date time of he previous field
       * @type {boolean}
       */
      let check2v1 = true;
      let check3v2 = true;
      let check4v3 = true;

      const elapsedSleepTimeDivHeight = tweened(0, {
        duration: 450,
        easing: cubicOut
      }); validate_store(elapsedSleepTimeDivHeight, 'elapsedSleepTimeDivHeight'); subscribe($$self, elapsedSleepTimeDivHeight, $$value => { $elapsedSleepTimeDivHeight = $$value; $$invalidate('$elapsedSleepTimeDivHeight', $elapsedSleepTimeDivHeight); });

      let time = new Date();

      onMount(() => {
        const interval = setInterval(() => {
          $$invalidate('time', time = new Date());
        }, 1000);

        return () => {
          clearInterval(interval);
        };
      });

      function validateAndSend() {
        if (
          check2v1 &&
          check3v2 &&
          check4v3 &&
          $gapiInstance.client.sheets !== null
        ) {
          $gapiInstance.client.sheets.spreadsheets.values
            .append({
              spreadsheetId: credentials.SHEET_ID,
              range: "Sheet1",
              valueInputOption: "USER_ENTERED",
              resource: {
                values: [
                  [
                    putDownDate + " " + putDownTime,
                    sleepDate + " " + sleepTime,
                    wakeDate + " " + wakeTime,
                    pickUpDate + " " + pickUpTime
                  ]
                ]
              }
            })
            .then(response => {
              if (response.status == 200) {
                $gapiInstance.client.sheets.spreadsheets
                  .batchUpdate({
                    spreadsheetId: credentials.SHEET_ID,
                    requests: [
                      {
                        repeatCell: {
                          range: {
                            sheetId: 0,
                            startRowIndex: 1,
                            startColumnIndex: 0,
                            endColumnIndex: 4
                          },
                          cell: {
                            userEnteredFormat: {
                              numberFormat: {
                                type: "DATE",
                                pattern: "d mmm, h:mm am/pm"
                              }
                            }
                          },
                          fields: "userEnteredFormat.numberFormat"
                        }
                      }
                    ]
                  })
                  .then(response => console.log(response));
              }
            });
        }
      }

      function receivePutDown(event) {
        $$invalidate('putDownDate', putDownDate = event.detail.date);
        $$invalidate('putDownTime', putDownTime = event.detail.time);
      }

      function receiveFellAsleep(event) {
        $$invalidate('sleepDate', sleepDate = event.detail.date);
        $$invalidate('sleepTime', sleepTime = event.detail.time);
      }

      function receiveWokeUp(event) {
        $$invalidate('wakeDate', wakeDate = event.detail.date);
        $$invalidate('wakeTime', wakeTime = event.detail.time);
      }

      function receivePickedUp(event) {
        $$invalidate('pickUpDate', pickUpDate = event.detail.date);
        $$invalidate('pickUpTime', pickUpTime = event.detail.time);
      }

    	function click_handler() {
    		return ($userName !== undefined ? validateAndSend() : signIn());
    	}

    	$$self.$$.update = ($$dirty = { putDownDate: 1, sleepDate: 1, sleepTime: 1, putDownTime: 1, wakeDate: 1, wakeTime: 1, pickUpDate: 1, pickUpTime: 1, check2v1: 1, check3v2: 1, time: 1 }) => {
    		if ($$dirty.putDownDate) { $$invalidate('sleepDate', sleepDate = putDownDate); }
    		if ($$dirty.sleepDate || $$dirty.sleepTime || $$dirty.putDownDate || $$dirty.putDownTime) { if (
            isAfter(
              new Date(sleepDate + " " + sleepTime),
              new Date(putDownDate + " " + putDownTime)
            ) ||
            isEqual(
              new Date(sleepDate + " " + sleepTime),
              new Date(putDownDate + " " + putDownTime)
            )
          ) {
            $$invalidate('check2v1', check2v1 = true);
          } else {
            $$invalidate('check2v1', check2v1 = false);
          } }
    		if ($$dirty.putDownDate) { $$invalidate('wakeDate', wakeDate = putDownDate); }
    		if ($$dirty.wakeDate || $$dirty.wakeTime || $$dirty.sleepDate || $$dirty.sleepTime) { if (
            isAfter(
              new Date(wakeDate + " " + wakeTime),
              new Date(sleepDate + " " + sleepTime)
            ) ||
            isEqual(
              new Date(wakeDate + " " + wakeTime),
              new Date(sleepDate + " " + sleepTime)
            )
          ) {
            $$invalidate('check3v2', check3v2 = true);
          } else {
            $$invalidate('check3v2', check3v2 = false);
          } }
    		if ($$dirty.putDownDate) { $$invalidate('pickUpDate', pickUpDate = putDownDate); }
    		if ($$dirty.pickUpDate || $$dirty.pickUpTime || $$dirty.wakeDate || $$dirty.wakeTime) { if (
            isAfter(
              new Date(pickUpDate + " " + pickUpTime),
              new Date(wakeDate + " " + wakeTime)
            ) ||
            isEqual(
              new Date(pickUpDate + " " + pickUpTime),
              new Date(wakeDate + " " + wakeTime)
            )
          ) {
            $$invalidate('check4v3', check4v3 = true);
          } else {
            $$invalidate('check4v3', check4v3 = false);
          } }
    		if ($$dirty.check2v1 || $$dirty.check3v2 || $$dirty.time || $$dirty.sleepDate || $$dirty.sleepTime || $$dirty.wakeDate || $$dirty.wakeTime) { if (
            check2v1 &&
            !check3v2 &&
            isAfter(time, new Date(sleepDate + " " + sleepTime))
          ) {
            $$invalidate('elapsedSleepTime', elapsedSleepTime = differenceInMinutes(
              time,
              new Date(sleepDate + " " + sleepTime)
            ));
            /**
             * Tween div height from 0 to 6rem
             */
            elapsedSleepTimeDivHeight.set(6);
          } else if (
            check2v1 &&
            check3v2 &&
            isAfter(
              new Date(wakeDate + " " + wakeTime),
              new Date(sleepDate + " " + sleepTime)
            )
          ) {
            $$invalidate('elapsedSleepTime', elapsedSleepTime = differenceInMinutes(
              new Date(wakeDate + " " + wakeTime),
              new Date(sleepDate + " " + sleepTime)
            ));
          } else {
            $$invalidate('elapsedSleepTime', elapsedSleepTime = 0);
            /**
             * Tween div height to 0, hiding the div
             */
            elapsedSleepTimeDivHeight.set(0);
          } }
    	};

    	return {
    		putDownDate,
    		putDownTime,
    		sleepDate,
    		sleepTime,
    		wakeDate,
    		wakeTime,
    		pickUpDate,
    		pickUpTime,
    		elapsedSleepTime,
    		check2v1,
    		check3v2,
    		check4v3,
    		elapsedSleepTimeDivHeight,
    		validateAndSend,
    		receivePutDown,
    		receiveFellAsleep,
    		receiveWokeUp,
    		receivePickedUp,
    		$elapsedSleepTimeDivHeight,
    		$userName,
    		click_handler
    	};
    }

    class Entry extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src\components\SignIn.svelte generated by Svelte v3.4.0 */

    const file$2 = "src\\components\\SignIn.svelte";

    function create_fragment$2(ctx) {
    	var meta, meta_content_value;

    	return {
    		c: function create() {
    			meta = element("meta");
    			meta.name = "google-signin-client_id";
    			meta.content = meta_content_value = credentials.CLIENT_ID;
    			add_location(meta, file$2, 111, 2, 2540);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			append(document.head, meta);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			detach(meta);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let isSignedIn = false;

      onMount(() => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";

        script.onload = () => {
          gapi.load("client:auth2", initClient);
        };

        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      });

      function initClient() {
        gapi.client
          .init({
            clientID: credentials.CLIENT_ID,
            apiKey: credentials.API_KEY,
            scope: credentials.SCOPES,
            discoveryDocs: credentials.DISCOVERY_DOCS
          })
          .then(() => {
            gapi.load("auth2", initAuth2);
          });
      }

      function initAuth2() {
        gapi.auth2
          .init({
            clientID: credentials.CLIENT_ID,
            scope: credentials.SCOPES
          })
          .then(() => {
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
          });
      }

      function updateSigninStatus(signedIn) {
        if (signedIn) {
          console.log("Signed in automatically");
          $$invalidate('isSignedIn', isSignedIn = true);

          gapiInstance.set(gapi);
          userName.set(
            gapi.auth2
              .getAuthInstance()
              .currentUser.get()
              .getBasicProfile()
              .getName()
          );
          userName.set(
            gapi.auth2
              .getAuthInstance()
              .currentUser.get()
              .getBasicProfile()
              .getImageUrl()
          );
        } else {
          $$invalidate('isSignedIn', isSignedIn = false);
          userName.set();
          userName.set();
        }
      }

    	return {};
    }

    class SignIn extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\components\Scaffold.svelte generated by Svelte v3.4.0 */

    const file$3 = "src\\components\\Scaffold.svelte";

    function create_fragment$3(ctx) {
    	var div1, t0, div0, button0, svg0, path0, t1, span0, button0_class_value, t3, button1, svg1, path1, rect0, rect1, rect2, rect3, t4, span1, button1_class_value, t6, button2, svg2, path2, t7, span2, button2_class_value, current, dispose;

    	const default_slot_1 = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_1, ctx, null);

    	return {
    		c: function create() {
    			div1 = element("div");

    			if (default_slot) default_slot.c();
    			t0 = space();
    			div0 = element("div");
    			button0 = element("button");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t1 = space();
    			span0 = element("span");
    			span0.textContent = "Entry";
    			t3 = space();
    			button1 = element("button");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			rect2 = svg_element("rect");
    			rect3 = svg_element("rect");
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Summary";
    			t6 = space();
    			button2 = element("button");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t7 = space();
    			span2 = element("span");
    			span2.textContent = "Settings";

    			attr(path0, "d", "M80.197,44.939v-9.746c0-1.761,1.433-3.193,3.193-3.193h60.053c1.761,0,3.193,1.433,3.193,3.193v9.746\r\n          c0,1.761-1.433,3.193-3.193,3.193H83.391C81.63,48.133,80.197,46.7,80.197,44.939z\r\n          M131.841,17c-0.768-9.5-8.729-17-18.424-17\r\n          S95.761,7.5,94.993,17H131.841z\r\n          M192.309,55.334v151.333c0,11.12-9.047,20.167-20.167,20.167H54.692\r\n          c-11.12,0-20.167-9.047-20.167-20.167V55.334c0-11.12,9.047-20.167,20.167-20.167h10.506c0,0.009-0.001,0.018-0.001,0.026v9.746\r\n          c0,10.032,8.162,18.193,18.193,18.193h60.053c10.032,0,18.193-8.161,18.193-18.193v-9.746c0-0.009-0.001-0.018-0.001-0.026h10.506\r\n          C183.262,35.167,192.309,44.214,192.309,55.334z\r\n          M88.183,143.449c-3.526-2.173-8.147-1.077-10.32,2.449l-7.092,11.504l-3.661-2.884\r\n          c-3.252-2.563-7.97-2.002-10.532,1.252c-2.563,3.255-2.002,7.97,1.252,10.533l10.271,8.089c1.332,1.049,2.969,1.607,4.64,1.607\r\n          c0.436,0,0.875-0.038,1.311-0.115c2.105-0.374,3.952-1.629,5.074-3.449l11.506-18.666C92.806,150.243,91.709,145.623,88.183,143.449\r\n          z\r\n          M88.183,89.449c-3.526-2.174-8.147-1.076-10.32,2.449l-7.092,11.504l-3.661-2.884c-3.252-2.562-7.97-2.002-10.532,1.252\r\n          c-2.563,3.255-2.002,7.97,1.252,10.533l10.271,8.089c1.332,1.049,2.969,1.607,4.64,1.607c0.436,0,0.875-0.038,1.311-0.115\r\n          c2.105-0.374,3.952-1.629,5.074-3.449L90.632,99.77C92.806,96.243,91.709,91.623,88.183,89.449z\r\n          M165.858,168.5\r\n          c0-4.143-3.357-7.5-7.5-7.5h-49c-4.142,0-7.5,3.357-7.5,7.5s3.358,7.5,7.5,7.5h49C162.501,176,165.858,172.643,165.858,168.5z\r\n          M165.858,114.5c0-4.143-3.357-7.5-7.5-7.5h-49c-4.142,0-7.5,3.357-7.5,7.5s3.358,7.5,7.5,7.5h49\r\n          C162.501,122,165.858,118.643,165.858,114.5z");
    			add_location(path0, file$3, 32, 8, 1462);
    			attr(svg0, "class", "icon svelte-a5m3na");
    			attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg0, "viewBox", "0 0 226.834 226.834");
    			add_location(svg0, file$3, 28, 6, 1342);
    			add_location(span0, file$3, 53, 6, 3254);
    			button0.className = button0_class_value = "button " + (ctx.$showEntry ? 'selected' : '') + " svelte-a5m3na";
    			add_location(button0, file$3, 25, 4, 1228);
    			attr(path1, "d", "M534.75,68.238c-8.945-8.945-19.694-13.417-32.261-13.417H45.681c-12.562,0-23.313,4.471-32.264,13.417\r\n          C4.471,77.185,0,87.936,0,100.499v347.173c0,12.566,4.471,23.318,13.417,32.264c8.951,8.946,19.702,13.419,32.264,13.419h456.815\r\n          c12.56,0,23.312-4.473,32.258-13.419c8.945-8.945,13.422-19.697,13.422-32.264V100.499\r\n          C548.176,87.936,543.699,77.185,534.75,68.238z\r\n          M511.627,447.672c0,2.478-0.903,4.62-2.711,6.427\r\n          c-1.81,1.807-3.952,2.71-6.427,2.71H45.681c-2.473,0-4.615-0.903-6.423-2.71c-1.807-1.813-2.712-3.949-2.712-6.427V100.499\r\n          c0-2.474,0.902-4.611,2.712-6.423c1.809-1.804,3.951-2.708,6.423-2.708h456.815c2.471,0,4.613,0.902,6.42,2.708\r\n          c1.808,1.812,2.711,3.949,2.711,6.423V447.672L511.627,447.672z");
    			add_location(path1, file$3, 62, 8, 3531);
    			attr(rect0, "x", "73.092");
    			attr(rect0, "y", "310.635");
    			attr(rect0, "width", "73.089");
    			attr(rect0, "height", "109.632");
    			add_location(rect0, file$3, 71, 8, 4333);
    			attr(rect1, "x", "182.728");
    			attr(rect1, "y", "164.452");
    			attr(rect1, "width", "73.085");
    			attr(rect1, "height", "255.814");
    			add_location(rect1, file$3, 72, 8, 4406);
    			attr(rect2, "x", "292.362");
    			attr(rect2, "y", "237.541");
    			attr(rect2, "width", "73.083");
    			attr(rect2, "height", "182.726");
    			add_location(rect2, file$3, 73, 8, 4480);
    			attr(rect3, "x", "401.994");
    			attr(rect3, "y", "127.907");
    			attr(rect3, "width", "73.091");
    			attr(rect3, "height", "292.36");
    			add_location(rect3, file$3, 74, 8, 4554);
    			attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg1, "class", "icon svelte-a5m3na");
    			attr(svg1, "viewBox", "0 0 548.176 548.176");
    			add_location(svg1, file$3, 58, 6, 3411);
    			add_location(span1, file$3, 76, 6, 4639);
    			button1.className = button1_class_value = "button " + (ctx.$showSummary ? 'selected' : '') + " svelte-a5m3na";
    			add_location(button1, file$3, 55, 4, 3293);
    			set_style(path2, "fill-rule", "evenodd");
    			set_style(path2, "clip-rule", "evenodd");
    			attr(path2, "d", "M267.92,119.461c-0.425-3.778-4.83-6.617-8.639-6.617\r\n          c-12.315,0-23.243-7.231-27.826-18.414c-4.682-11.454-1.663-24.812,7.515-33.231c2.889-2.641,3.24-7.062,0.817-10.133\r\n          c-6.303-8.004-13.467-15.234-21.289-21.5c-3.063-2.458-7.557-2.116-10.213,0.825c-8.01,8.871-22.398,12.168-33.516,7.529\r\n          c-11.57-4.867-18.866-16.591-18.152-29.176c0.235-3.953-2.654-7.39-6.595-7.849c-10.038-1.161-20.164-1.197-30.232-0.08\r\n          c-3.896,0.43-6.785,3.786-6.654,7.689c0.438,12.461-6.946,23.98-18.401,28.672c-10.985,4.487-25.272,1.218-33.266-7.574\r\n          c-2.642-2.896-7.063-3.252-10.141-0.853c-8.054,6.319-15.379,13.555-21.74,21.493c-2.481,3.086-2.116,7.559,0.802,10.214\r\n          c9.353,8.47,12.373,21.944,7.514,33.53c-4.639,11.046-16.109,18.165-29.24,18.165c-4.261-0.137-7.296,2.723-7.762,6.597\r\n          c-1.182,10.096-1.196,20.383-0.058,30.561c0.422,3.794,4.961,6.608,8.812,6.608c11.702-0.299,22.937,6.946,27.65,18.415\r\n          c4.698,11.454,1.678,24.804-7.514,33.23c-2.875,2.641-3.24,7.055-0.817,10.126c6.244,7.953,13.409,15.19,21.259,21.508\r\n          c3.079,2.481,7.559,2.131,10.228-0.81c8.04-8.893,22.427-12.184,33.501-7.536c11.599,4.852,18.895,16.575,18.181,29.167\r\n          c-0.233,3.955,2.67,7.398,6.595,7.85c5.135,0.599,10.301,0.898,15.481,0.898c4.917,0,9.835-0.27,14.752-0.817\r\n          c3.897-0.43,6.784-3.786,6.653-7.696c-0.451-12.454,6.946-23.973,18.386-28.657c11.059-4.517,25.286-1.211,33.281,7.572\r\n          c2.657,2.89,7.047,3.239,10.142,0.848c8.039-6.304,15.349-13.534,21.74-21.494c2.48-3.079,2.13-7.559-0.803-10.213\r\n          c-9.353-8.47-12.388-21.946-7.529-33.524c4.568-10.899,15.612-18.217,27.491-18.217l1.662,0.043\r\n          c3.853,0.313,7.398-2.655,7.865-6.588C269.044,139.917,269.058,129.639,267.92,119.461z\r\n          M134.595,179.491\r\n          c-24.718,0-44.824-20.106-44.824-44.824c0-24.717,20.106-44.824,44.824-44.824c24.717,0,44.823,20.107,44.823,44.824\r\n          C179.418,159.385,159.312,179.491,134.595,179.491z");
    			add_location(path2, file$3, 85, 8, 4920);
    			attr(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg2, "viewBox", "0 0 268.765 268.765");
    			attr(svg2, "class", "icon svelte-a5m3na");
    			add_location(svg2, file$3, 81, 6, 4800);
    			add_location(span2, file$3, 106, 6, 6994);
    			button2.className = button2_class_value = "button " + (ctx.$showSettings ? 'selected' : '') + " svelte-a5m3na";
    			add_location(button2, file$3, 78, 4, 4680);
    			div0.className = "bottom-bar svelte-a5m3na";
    			add_location(div0, file$3, 24, 2, 1198);
    			div1.className = "w-full h-screen bg-backgroundColor overflow-scroll";
    			add_location(div1, file$3, 22, 0, 1118);

    			dispose = [
    				listen(button0, "click", ctx.click_handler),
    				listen(button1, "click", ctx.click_handler_1),
    				listen(button2, "click", ctx.click_handler_2)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div1_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			append(div1, t0);
    			append(div1, div0);
    			append(div0, button0);
    			append(button0, svg0);
    			append(svg0, path0);
    			append(button0, t1);
    			append(button0, span0);
    			append(div0, t3);
    			append(div0, button1);
    			append(button1, svg1);
    			append(svg1, path1);
    			append(svg1, rect0);
    			append(svg1, rect1);
    			append(svg1, rect2);
    			append(svg1, rect3);
    			append(button1, t4);
    			append(button1, span1);
    			append(div0, t6);
    			append(div0, button2);
    			append(button2, svg2);
    			append(svg2, path2);
    			append(button2, t7);
    			append(button2, span2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
    			}

    			if ((!current || changed.$showEntry) && button0_class_value !== (button0_class_value = "button " + (ctx.$showEntry ? 'selected' : '') + " svelte-a5m3na")) {
    				button0.className = button0_class_value;
    			}

    			if ((!current || changed.$showSummary) && button1_class_value !== (button1_class_value = "button " + (ctx.$showSummary ? 'selected' : '') + " svelte-a5m3na")) {
    				button1.className = button1_class_value;
    			}

    			if ((!current || changed.$showSettings) && button2_class_value !== (button2_class_value = "button " + (ctx.$showSettings ? 'selected' : '') + " svelte-a5m3na")) {
    				button2.className = button2_class_value;
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (default_slot && default_slot.i) default_slot.i(local);
    			current = true;
    		},

    		o: function outro(local) {
    			if (default_slot && default_slot.o) default_slot.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    }

    function handleClick(target) {
      if (target === "entry") {
        showEntry.set(true);
        showSummary.set(false);
        showSettings.set(false);
      } else if (target === "summary") {
        showEntry.set(false);
        showSummary.set(true);
        showSettings.set(false);
      } else if (target === "settings") {
        showEntry.set(false);
        showSummary.set(false);
        showSettings.set(true);
      }
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $showEntry, $showSummary, $showSettings;

    	validate_store(showEntry, 'showEntry');
    	subscribe($$self, showEntry, $$value => { $showEntry = $$value; $$invalidate('$showEntry', $showEntry); });
    	validate_store(showSummary, 'showSummary');
    	subscribe($$self, showSummary, $$value => { $showSummary = $$value; $$invalidate('$showSummary', $showSummary); });
    	validate_store(showSettings, 'showSettings');
    	subscribe($$self, showSettings, $$value => { $showSettings = $$value; $$invalidate('$showSettings', $showSettings); });

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler() {
    		return handleClick('entry');
    	}

    	function click_handler_1() {
    		return handleClick('summary');
    	}

    	function click_handler_2() {
    		return handleClick('settings');
    	}

    	$$self.$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return {
    		$showEntry,
    		$showSummary,
    		$showSettings,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		$$slots,
    		$$scope
    	};
    }

    class Scaffold extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.4.0 */

    const file$4 = "src\\App.svelte";

    // (17:2) <Scaffold>
    function create_default_slot$1(ctx) {
    	var current;

    	var entry = new Entry({ $$inline: true });

    	return {
    		c: function create() {
    			entry.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(entry, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			entry.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			entry.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			entry.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	var main, t, current;

    	var scaffold = new Scaffold({
    		props: {
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var signin = new SignIn({
    		props: { class: "absolute" },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			main = element("main");
    			scaffold.$$.fragment.c();
    			t = space();
    			signin.$$.fragment.c();
    			main.className = "overflow-hidden";
    			add_location(main, file$4, 15, 0, 544);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			mount_component(scaffold, main, null);
    			append(main, t);
    			mount_component(signin, main, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var scaffold_changes = {};
    			if (changed.$$scope) scaffold_changes.$$scope = { changed, ctx };
    			scaffold.$set(scaffold_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			scaffold.$$.fragment.i(local);

    			signin.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			scaffold.$$.fragment.o(local);
    			signin.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(main);
    			}

    			scaffold.$destroy();

    			signin.$destroy();
    		}
    	};
    }

    function instance$4($$self) {
    	

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/service-worker.js");
      }

    	return {};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /// <reference path=”../../typings/index.d.ts” />

    new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
