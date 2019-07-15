
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
    'use strict';

    function noop() {}

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

    let outros;

    function group_outros() {
    	outros = {
    		remaining: 0,
    		callbacks: []
    	};
    }

    function check_outros() {
    	if (!outros.remaining) {
    		run_all(outros.callbacks);
    	}
    }

    function on_outro(callback) {
    	outros.callbacks.push(callback);
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

    //Insert store variables here
    const signedInUser = writable();
    const gAPIInstance = writable();

    const credentials = {
      CLIENT_ID:
        "634914729787-buqfp7mh76bjh7bghe50tja5dlojkta8.apps.googleusercontent.com",
      API_KEY: "AIzaSyAGjmUfhPFXGnB6RE4FyetygrlsUnAO6mc",
      SCOPES: "https://www.googleapis.com/auth/spreadsheets.readonly",
      DISCOVERY_DOCS: ["https://sheets.googleapis.com/$discovery/rest?version=v4"]
    };

    /* src\components\SignInModal.svelte generated by Svelte v3.4.0 */

    const file = "src\\components\\SignInModal.svelte";

    function create_fragment(ctx) {
    	var meta, meta_content_value, t, div1, div0;

    	return {
    		c: function create() {
    			meta = element("meta");
    			t = space();
    			div1 = element("div");
    			div0 = element("div");
    			meta.name = "google-signin-client_id";
    			meta.content = meta_content_value = credentials.CLIENT_ID;
    			add_location(meta, file, 21, 2, 454);
    			div0.id = "my-signin2";
    			add_location(div0, file, 25, 2, 627);
    			div1.className = "w-full h-screen backgroundColor flex items-center justify-center";
    			add_location(div1, file, 24, 0, 545);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			append(document.head, meta);
    			insert(target, t, anchor);
    			insert(target, div1, anchor);
    			append(div1, div0);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			detach(meta);

    			if (detaching) {
    				detach(t);
    				detach(div1);
    			}
    		}
    	};
    }

    function renderButton(gapi) {
      gapi.signin2.render("my-signin2", {
        scope: credentials.SCOPES,
        width: 240,
        height: 50,
        longtitle: true,
        theme: "dark"
      });
    }

    function instance($$self, $$props, $$invalidate) {
    	let $gAPIInstance;

    	validate_store(gAPIInstance, 'gAPIInstance');
    	subscribe($$self, gAPIInstance, $$value => { $gAPIInstance = $$value; $$invalidate('$gAPIInstance', $gAPIInstance); });

    	

      onMount(() => {
        renderButton($gAPIInstance);
      });

    	return {};
    }

    class SignInModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src\components\Router.svelte generated by Svelte v3.4.0 */

    /* src\components\SheetTest.svelte generated by Svelte v3.4.0 */

    function create_fragment$1(ctx) {
    	return {
    		c: noop,

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $gAPIInstance;

    	validate_store(gAPIInstance, 'gAPIInstance');
    	subscribe($$self, gAPIInstance, $$value => { $gAPIInstance = $$value; $$invalidate('$gAPIInstance', $gAPIInstance); });

    	$$self.$$.update = ($$dirty = { $gAPIInstance: 1 }) => {
    		if ($$dirty.$gAPIInstance) { if ($gAPIInstance !== undefined) {
            $gAPIInstance.client.sheets.spreadsheets.values
              .get({
                spreadsheetId: "1XcXToo9F79vB-YoooATQhAY8Kb57uSpEEWdMa8gJSRw",
                range: "Sheet1!A726:O"
              })
              .then(response => {
                console.table(response.result.values);
              });
          } }
    	};

    	return {};
    }

    class SheetTest extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src\components\Entry.svelte generated by Svelte v3.4.0 */

    const file$1 = "src\\components\\Entry.svelte";

    function create_fragment$2(ctx) {
    	var div1, h10, t0, body0, input0, t1, input1, t2, div0, t4, div3, h11, t5, body1, input2, input2_value_value, t6, input3, input3_value_value, t7, div2, t9, div5, body2, t10, div4, t11, t12, t13_value = ctx.elapsedSleepTime === 1 ? 'minute' : 'minutes', t13, t14, div6, t16, h12, t17, input4, t18, input5, t19, div7, t21, h13, t22, input6, t23, input7, dispose;

    	return {
    		c: function create() {
    			div1 = element("div");
    			h10 = element("h1");
    			t0 = text("Put down at\r\n    ");
    			body0 = element("body");
    			input0 = element("input");
    			t1 = space();
    			input1 = element("input");
    			t2 = space();
    			div0 = element("div");
    			div0.textContent = "▼";
    			t4 = space();
    			div3 = element("div");
    			h11 = element("h1");
    			t5 = text("Fell asleep at\r\n    ");
    			body1 = element("body");
    			input2 = element("input");
    			t6 = space();
    			input3 = element("input");
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "▼";
    			t9 = space();
    			div5 = element("div");
    			body2 = element("body");
    			t10 = text("Asleep for\r\n    ");
    			div4 = element("div");
    			t11 = text(ctx.elapsedSleepTime);
    			t12 = space();
    			t13 = text(t13_value);
    			t14 = space();
    			div6 = element("div");
    			div6.textContent = "▼";
    			t16 = space();
    			h12 = element("h1");
    			t17 = text("Woke up at\r\n  ");
    			input4 = element("input");
    			t18 = space();
    			input5 = element("input");
    			t19 = space();
    			div7 = element("div");
    			div7.textContent = "▼";
    			t21 = space();
    			h13 = element("h1");
    			t22 = text("Picked up at\r\n  ");
    			input6 = element("input");
    			t23 = space();
    			input7 = element("input");
    			input0.className = "input svelte-7i2xf4";
    			attr(input0, "type", "date");
    			add_location(input0, file$1, 58, 6, 1536);
    			input1.className = "input svelte-7i2xf4";
    			attr(input1, "type", "time");
    			add_location(input1, file$1, 59, 6, 1604);
    			add_location(body0, file$1, 57, 4, 1522);
    			add_location(h10, file$1, 55, 2, 1495);
    			div0.className = "w-full my-8 text-3xl text-center";
    			add_location(div0, file$1, 62, 2, 1690);
    			div1.className = "background svelte-7i2xf4";
    			add_location(div1, file$1, 54, 0, 1467);
    			input2.className = "input svelte-7i2xf4";
    			attr(input2, "type", "date");
    			input2.value = input2_value_value = new ctx.Date().toDateInputValue();
    			input2.min = ctx.putDownDate;
    			add_location(input2, file$1, 68, 6, 1825);
    			input3.className = "input svelte-7i2xf4";
    			attr(input3, "type", "time");
    			input3.value = input3_value_value = new ctx.Date().toTimeInputValue();
    			input3.min = ctx.putDownTime;
    			add_location(input3, file$1, 74, 6, 1992);
    			add_location(body1, file$1, 67, 4, 1811);
    			add_location(h11, file$1, 65, 2, 1781);
    			div2.className = "w-full my-8 text-3xl text-center";
    			add_location(div2, file$1, 83, 2, 2179);
    			div3.className = "background svelte-7i2xf4";
    			add_location(div3, file$1, 64, 0, 1753);
    			div4.className = "inline-block px-2 py-1 rounded-full w-auto text-center\r\n      bg-secondaryColor font-medium";
    			add_location(div4, file$1, 88, 4, 2358);
    			body2.className = "text-2xl text-backgroundColor";
    			add_location(body2, file$1, 86, 2, 2292);
    			div5.className = "my-12 w-full justify-center flex";
    			add_location(div5, file$1, 85, 0, 2242);
    			div6.className = "w-full my-8 text-3xl text-center";
    			add_location(div6, file$1, 97, 0, 2584);
    			input4.className = "input svelte-7i2xf4";
    			attr(input4, "type", "date");
    			add_location(input4, file$1, 100, 2, 2661);
    			input5.className = "input svelte-7i2xf4";
    			attr(input5, "type", "time");
    			add_location(input5, file$1, 101, 2, 2722);
    			add_location(h12, file$1, 98, 0, 2639);
    			div7.className = "w-full my-8 text-3xl text-center";
    			add_location(div7, file$1, 103, 0, 2788);
    			input6.className = "input svelte-7i2xf4";
    			attr(input6, "type", "date");
    			add_location(input6, file$1, 106, 2, 2867);
    			input7.className = "input svelte-7i2xf4";
    			attr(input7, "type", "time");
    			add_location(input7, file$1, 107, 2, 2930);
    			add_location(h13, file$1, 104, 0, 2843);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input1, "input", ctx.input1_input_handler),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(input3, "input", ctx.input3_input_handler),
    				listen(input4, "input", ctx.input4_input_handler),
    				listen(input5, "input", ctx.input5_input_handler),
    				listen(input6, "input", ctx.input6_input_handler),
    				listen(input7, "input", ctx.input7_input_handler)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, h10);
    			append(h10, t0);
    			append(h10, body0);
    			append(body0, input0);

    			input0.value = ctx.putDownDate;

    			append(body0, t1);
    			append(body0, input1);

    			input1.value = ctx.putDownTime;

    			append(div1, t2);
    			append(div1, div0);
    			insert(target, t4, anchor);
    			insert(target, div3, anchor);
    			append(div3, h11);
    			append(h11, t5);
    			append(h11, body1);
    			append(body1, input2);

    			input2.value = ctx.sleepDate;

    			append(body1, t6);
    			append(body1, input3);

    			input3.value = ctx.sleepTime;

    			append(div3, t7);
    			append(div3, div2);
    			insert(target, t9, anchor);
    			insert(target, div5, anchor);
    			append(div5, body2);
    			append(body2, t10);
    			append(body2, div4);
    			append(div4, t11);
    			append(body2, t12);
    			append(body2, t13);
    			insert(target, t14, anchor);
    			insert(target, div6, anchor);
    			insert(target, t16, anchor);
    			insert(target, h12, anchor);
    			append(h12, t17);
    			append(h12, input4);

    			input4.value = ctx.wakeDate;

    			append(h12, t18);
    			append(h12, input5);

    			input5.value = ctx.wakeTime;

    			insert(target, t19, anchor);
    			insert(target, div7, anchor);
    			insert(target, t21, anchor);
    			insert(target, h13, anchor);
    			append(h13, t22);
    			append(h13, input6);

    			input6.value = ctx.pickUpDate;

    			append(h13, t23);
    			append(h13, input7);

    			input7.value = ctx.pickUpTime;
    		},

    		p: function update(changed, ctx) {
    			if (changed.putDownDate) input0.value = ctx.putDownDate;
    			if (changed.putDownTime) input1.value = ctx.putDownTime;
    			if (changed.sleepDate) input2.value = ctx.sleepDate;

    			if (changed.putDownDate) {
    				input2.min = ctx.putDownDate;
    			}

    			if (changed.sleepTime) input3.value = ctx.sleepTime;

    			if (changed.putDownTime) {
    				input3.min = ctx.putDownTime;
    			}

    			if (changed.elapsedSleepTime) {
    				set_data(t11, ctx.elapsedSleepTime);
    			}

    			if ((changed.elapsedSleepTime) && t13_value !== (t13_value = ctx.elapsedSleepTime === 1 ? 'minute' : 'minutes')) {
    				set_data(t13, t13_value);
    			}

    			if (changed.wakeDate) input4.value = ctx.wakeDate;
    			if (changed.wakeTime) input5.value = ctx.wakeTime;
    			if (changed.pickUpDate) input6.value = ctx.pickUpDate;
    			if (changed.pickUpTime) input7.value = ctx.pickUpTime;
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    				detach(t4);
    				detach(div3);
    				detach(t9);
    				detach(div5);
    				detach(t14);
    				detach(div6);
    				detach(t16);
    				detach(h12);
    				detach(t19);
    				detach(div7);
    				detach(t21);
    				detach(h13);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	Date.prototype.toDateInputValue = function() {
        let local = new Date(this);
        local.setMinutes(this.getMinutes() - this.getTimezoneOffset());

        return local.toJSON().slice(0, 10);
      };

      Date.prototype.toTimeInputValue = function() {
        let local = new Date(this);
        local.setMinutes(this.getMinutes() - this.getTimezoneOffset());

        return local.toJSON().slice(11, 16);
      };

      let putDownDate = new Date().toDateInputValue();
      let putDownTime = new Date().toTimeInputValue();
      let sleepDate,
        sleepTime,
        wakeDate,
        wakeTime,
        pickUpDate,
        pickUpTime,
        currentDateTime,
        elapsedSleepTime;

      let time = new Date();

      onMount(() => {
        const interval = setInterval(() => {
          $$invalidate('time', time = new Date());
        }, 1000);

        return () => {
          clearInterval(interval);
        };
      });

    	function input0_input_handler() {
    		putDownDate = this.value;
    		$$invalidate('putDownDate', putDownDate);
    	}

    	function input1_input_handler() {
    		putDownTime = this.value;
    		$$invalidate('putDownTime', putDownTime);
    	}

    	function input2_input_handler() {
    		sleepDate = this.value;
    		$$invalidate('sleepDate', sleepDate);
    	}

    	function input3_input_handler() {
    		sleepTime = this.value;
    		$$invalidate('sleepTime', sleepTime);
    	}

    	function input4_input_handler() {
    		wakeDate = this.value;
    		$$invalidate('wakeDate', wakeDate);
    	}

    	function input5_input_handler() {
    		wakeTime = this.value;
    		$$invalidate('wakeTime', wakeTime);
    	}

    	function input6_input_handler() {
    		pickUpDate = this.value;
    		$$invalidate('pickUpDate', pickUpDate);
    	}

    	function input7_input_handler() {
    		pickUpTime = this.value;
    		$$invalidate('pickUpTime', pickUpTime);
    	}

    	$$self.$$.update = ($$dirty = { time: 1, sleepTime: 1, sleepDate: 1, currentDateTime: 1 }) => {
    		if ($$dirty.time) { $$invalidate('currentDateTime', currentDateTime = time.getTime()); }
    		if ($$dirty.sleepTime || $$dirty.sleepDate || $$dirty.currentDateTime) { if (sleepTime === undefined) {
            $$invalidate('elapsedSleepTime', elapsedSleepTime = 0);
          } else {
            let sleepDateMillis = new Date(sleepDate + " " + sleepTime).getTime();
        
            $$invalidate('elapsedSleepTime', elapsedSleepTime = Math.round(
              (currentDateTime - sleepDateMillis) / 1000 / 60
            ));
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
    		Date,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input7_input_handler
    	};
    }

    class Entry extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* src\App.svelte generated by Svelte v3.4.0 */

    const file$2 = "src\\App.svelte";

    // (78:2) {#if $signedInUser === undefined || $gAPIInstance !== undefined}
    function create_if_block(ctx) {
    	var current;

    	var signinmodal = new SignInModal({ $$inline: true });

    	return {
    		c: function create() {
    			signinmodal.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(signinmodal, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			signinmodal.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			signinmodal.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			signinmodal.$destroy(detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	var meta, meta_content_value, t0, main, t1, t2, current;

    	var sheettest = new SheetTest({ $$inline: true });

    	var entry = new Entry({ $$inline: true });

    	var if_block = (ctx.$signedInUser === undefined || ctx.$gAPIInstance !== undefined) && create_if_block(ctx);

    	return {
    		c: function create() {
    			meta = element("meta");
    			t0 = space();
    			main = element("main");
    			sheettest.$$.fragment.c();
    			t1 = space();
    			entry.$$.fragment.c();
    			t2 = space();
    			if (if_block) if_block.c();
    			meta.name = "google-signin-client_id";
    			meta.content = meta_content_value = credentials.CLIENT_ID;
    			add_location(meta, file$2, 71, 2, 2279);
    			main.className = "overflow-hidden";
    			add_location(main, file$2, 74, 0, 2370);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			append(document.head, meta);
    			insert(target, t0, anchor);
    			insert(target, main, anchor);
    			mount_component(sheettest, main, null);
    			append(main, t1);
    			mount_component(entry, main, null);
    			append(main, t2);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$signedInUser === undefined || ctx.$gAPIInstance !== undefined) {
    				if (!if_block) {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.i(1);
    					if_block.m(main, null);
    				} else {
    									if_block.i(1);
    				}
    			} else if (if_block) {
    				group_outros();
    				on_outro(() => {
    					if_block.d(1);
    					if_block = null;
    				});

    				if_block.o(1);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			sheettest.$$.fragment.i(local);

    			entry.$$.fragment.i(local);

    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			sheettest.$$.fragment.o(local);
    			entry.$$.fragment.o(local);
    			if (if_block) if_block.o();
    			current = false;
    		},

    		d: function destroy(detaching) {
    			detach(meta);

    			if (detaching) {
    				detach(t0);
    				detach(main);
    			}

    			sheettest.$destroy();

    			entry.$destroy();

    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $signedInUser, $gAPIInstance;

    	validate_store(signedInUser, 'signedInUser');
    	subscribe($$self, signedInUser, $$value => { $signedInUser = $$value; $$invalidate('$signedInUser', $signedInUser); });
    	validate_store(gAPIInstance, 'gAPIInstance');
    	subscribe($$self, gAPIInstance, $$value => { $gAPIInstance = $$value; $$invalidate('$gAPIInstance', $gAPIInstance); });

    	

      let googleAuth;

      onMount(() => {
        const gapiScript = document.createElement("script");

        gapiScript.onload = () => {
          gapi.load("client:auth2", () => {
            gapi.client
              .init({
                clientID: credentials.CLIENT_ID,
                apiKey: credentials.API_KEY,
                scope: credentials.SCOPES,
                discoveryDocs: credentials.DISCOVERY_DOCS
              })
              .then(() => {
                if (gapi.auth2.getAuthInstance() === null) {
                  gapi.load("auth2", () => {
                    gapi.auth2
                      .init({
                        client_id: credentials.CLIENT_ID,
                        scope: credentials.SCOPES
                      })
                      .then(googleAuth => {
                        gAPIInstance.set(gapi);

                        if (googleAuth.isSignedIn.get()) {
                          signedInUser.set(googleAuth.currentUser.get());

                          console.log(
                            "Automatically signed in as " +
                              $signedInUser.getBasicProfile().getName()
                          );
                        }
                      });
                  });
                } else {
                  gAPIInstance.set(gapi);

                  if (googleAuth.isSignedIn.get()) {
                    signedInUser.set(googleAuth.currentUser.get());

                    console.log(
                      "Automatically signed in as " +
                        $signedInUser.getBasicProfile().getName()
                    );
                  }
                }
              });
          });
        };
        gapiScript.src = "https://apis.google.com/js/platform.js";
        document.head.appendChild(gapiScript);
      });

      // if ("serviceWorker" in navigator) {
      //   navigator.serviceWorker.register("/service-worker.js");
      // }

    	return { $signedInUser, $gAPIInstance };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /// <reference path=”../../typings/index.d.ts” />

    new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
