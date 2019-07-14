
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

    function children(element) {
    	return Array.from(element.childNodes);
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

    /* src\App.svelte generated by Svelte v3.4.0 */

    const file$1 = "src\\App.svelte";

    // (63:2) {#if $signedInUser === undefined || $gAPIInstance !== undefined}
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

    function create_fragment$2(ctx) {
    	var meta, meta_content_value, t0, main, t1, current;

    	var sheettest = new SheetTest({ $$inline: true });

    	var if_block = (ctx.$signedInUser === undefined || ctx.$gAPIInstance !== undefined) && create_if_block(ctx);

    	return {
    		c: function create() {
    			meta = element("meta");
    			t0 = space();
    			main = element("main");
    			sheettest.$$.fragment.c();
    			t1 = space();
    			if (if_block) if_block.c();
    			meta.name = "google-signin-client_id";
    			meta.content = meta_content_value = credentials.CLIENT_ID;
    			add_location(meta, file$1, 57, 2, 1761);
    			main.className = "overflow-hidden";
    			add_location(main, file$1, 60, 0, 1852);
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

    			if (if_block) if_block.i();
    			current = true;
    		},

    		o: function outro(local) {
    			sheettest.$$.fragment.o(local);
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

    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $signedInUser, $gAPIInstance;

    	validate_store(signedInUser, 'signedInUser');
    	subscribe($$self, signedInUser, $$value => { $signedInUser = $$value; $$invalidate('$signedInUser', $signedInUser); });
    	validate_store(gAPIInstance, 'gAPIInstance');
    	subscribe($$self, gAPIInstance, $$value => { $gAPIInstance = $$value; $$invalidate('$gAPIInstance', $gAPIInstance); });

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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /// <reference path=”../../typings/index.d.ts” />

    new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
