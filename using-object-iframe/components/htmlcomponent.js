var HTMLComponent = new function() {
    var self = this;
    var usingIframe = false;
    
    // me is the container hosting this object
    this.me = null;
    
    this.Config = {};
    this.Helper = {};
    this.Config.ShowDocumentation = true;
    this.Config.InheritStyleFromParent = true;
    this.Config.Visible = true;
    this.Config.BaseTargetsParent = true;
    this.Config.UseIFrame = false;
    this.initComponent = function() {};
    
    
    this.Helper.addCSSToParent = function(href) {
        parent.document.getElementsByTagName('head')[0].appendChild(createCSSLink(href));
    };
    
    this.Helper.addCSSToComponent = function(href) {
        document.getElementsByTagName('head')[0].appendChild(createCSSLink(href));
    };
    
    function createCSSLink(href) {
        var link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = href;
        return link;
    }
    
    this.Event = new function() {
            this.raise = function(eventName, data) {
                    var event = {data: data};
                    var eventNotCalled = true;
                    
                    // We try customEvents first and then see if the
                    // user is using JQuery on the parent and use it
                    // incase customeEvents are not possible.
                    if(parent.document.createEvent) {
                        event = parent.document.createEvent("Event");
                        event.data = data;
                        event.initEvent(eventName, true, false);
                    } else if(parent.jQuery) {
                        if(parent.jQuery(self.me).trigger) {
                            parent.jQuery(self.me).trigger(eventName, data);
                            eventNotCalled = false;
                        }
                    }

                    if(self.me[eventName]) {
                       if(eventNotCalled) self.me[eventName].apply(self.me, [event]);
                    } else {
                       throw eventName + ": No such event defined";
                       return;
                    }
                    
                    if(self.me.dispatchEvent) return self.me.dispatchEvent(event);
                    return event;
            };
            return this;
    };
    
    function setupIFrame() {
        var iframes = parent.document.getElementsByTagName("iframe");
        for(var x = 0; x < iframes.length; x++) {
            try {
                var doc = iframes[x].contentDocument;
                if(!doc) doc = iframes[x].contentWindow.document;
                if(window.document === doc) {
                    this.me = iframes[x];
                    usingIframe = true;
                    break;
                }
            } catch (ex) {
                // Don't have access to object document
            }
        }
    }
    
    function setupObject() {
        var objects = parent.document.getElementsByTagName("object");
        var objectNotFound = true;
        
        for(var x = 0; x < objects.length; x++) {
            try {
                if(window.document === objects[x].contentDocument) {
                    this.me = objects[x];
                    objectNotFound = false;
                    break;
                }
            } catch (ex) {
                // Don't have access to object document
            }
        }
        
        //Incase object was not found search for iframes
        if(objectNotFound) setupIFrame.call(this);
    }
    
    function setProperty(name, value) {
        var funcName = "set_" + name;
        if(typeof window[funcName] === "function") {
            window[funcName].call(window, value);
        }
    }
    
    function getProperty(name) {
        var funcName = "get_" + name;
        if(typeof window[funcName] === "function") {
            return window[funcName].call(window);
        }
    }
        
    function setDefaultParamaters(object) {
        
        var setters = {};
        
        function setParameters() {
            var params = getParametersFromAttributes();
            for(var key in params) {
                var value;
                try {
                    value = JSON.parse(params[key]);
                } catch(e) {
                    value = params[key];
                }
                
                setProperty(setters[key], value);
            }
            
            params = getParametersFromObject();
            for(var key in params) {
                var value;
                try {
                    value = JSON.parse(params[key]);
                } catch(e) {
                    value = params[key];
                }
                setProperty(key, value);
            }
        }
        
        function getParametersFromObject() {
            var params = object.getElementsByTagName("param");
            var jsonParams = {};
            
            for(var x = 0; x < params.length; x++) {
                var name  = params[x].getAttribute("name");
                var value = params[x].getAttribute("value");

                jsonParams[name] = value;
            }
            
            return jsonParams;
        }
        
        function getParametersFromAttributes() {
            var attr = self.me.attributes;
            var params = {};
            
            for(var x = 0; x < attr.length; x++) {
                var name  = attr[x].nodeName;
                var value = attr[x].nodeValue;
                
                if(name.indexOf("data-param-") === 0) {
                    name = name.replace("data-param-", "");
                    params[name] = value;
                }
            }
            return params;
        }

        function setPublicMethodsProperties() {
        
            var win = window;
            var useDefineProperty = true;
            var oldStyleGetters = false;
            
            if(!Object.defineProperty) useDefineProperty = false;
            else if(self.me.__defineGetter__) oldStyleGetters = true;
            
            for(var x in win) {
                if(x.indexOf("public_") === 0) {
                    self.me[x.replace("public_", "")] = win[x];
                    continue;
                }

                if(x.indexOf("event_") === 0) {
                    var eventName = x.replace("event_", "");
                    if(typeof(self.me[eventName]) !== "function") self.me[eventName] = win[x];
                    continue;
                }

                if(x.indexOf("get_") === 0) {
                    if(useDefineProperty) Object.defineProperty(self.me, 
                                x.replace("get_", ""), 
                                {
                                    get : win[x], 
                                    configurable : true
                                });
                    else if(oldStyleGetters) self.me.__defineGetter__(x.replace("get_", ""), win[x]);
                    continue;
                }

                if(x.indexOf("set_") === 0) {
                    var setterName = x.replace("set_", "");
                    if(useDefineProperty) Object.defineProperty(self.me, 
                                setterName, 
                                {
                                    set : win[x], 
                                    configurable : true
                                });
                    else if(oldStyleGetters) self.me.__defineSetter__(setterName, win[x]);
                    setters[setterName.toLowerCase()] = setterName;
                    continue;
                }
            }
            
            self.me.__setProperty__ = setProperty;
            self.me.__getProperty__ = getProperty;
            
            //Allow the users to refresh the inherited styles
            if(!self.Config.InheritStyleFromParent) {
                self.me.refreshInheritedStyles = getInheritedStylesFromParent; 
            };
        }
        
        setPublicMethodsProperties();
        setParameters();
    }
    
    function setStyleSheets() {
        var stylesheet = null;
        var BODY_RULES = "body { position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; padding: 0px; margin: 0px; overflow: hidden; background: transparent; }";
        
        if(document.styleSheets.length > 0) stylesheet = document.styleSheets[0];
        
        if(stylesheet) {
            stylesheet.insertRule(BODY_RULES, 0);
            stylesheet.insertRule(getInheritedStylesFromParent(), 0);            
        } else { 
            var style = document.createElement('style');
            style.setAttribute("type", "text/css");
            var inheritedRules = getInheritedStylesFromParent();
            if (style.styleSheet) {   
                style.styleSheet.cssText = inheritedRules;
            } else {                
                var textnode = document.createTextNode(inheritedRules);
                style.appendChild(textnode);
            }
            document.getElementsByTagName('head')[0].appendChild(style);
	}
    }
    
    function setBaseTarget() {
        if(!self.Config.BaseTargetsParent) return;
        var base = document.createElement("base");
        base.target = "_parent";
        base.href = parent.location.href;
        document.getElementsByTagName('head')[0].appendChild(base);
    }
    
    function getInheritedStylesFromParent(baseElement) {
        if(!self.Config.InheritStyleFromParent) return "";
        if(!baseElement) baseElement = "body";
        
        var propertiesToInherit = [
            "border-collapse",
            "border-spacing",
            "caption-side",
            "color", 
            "font-family",
            "font-size",
            "font-style",
            "font-variant",
            "font-weight",
            "font",
            "cursor", 
            "direction", 
            "elevation",
            "empty-cells", 
            "letter-spacing",
            "line-height",
            "list-style-image",
            "list-style-position",
            "list-style-type",
            "list-style",
            "orphans",
            "text-align", 
            "text-indent", 
            "text-transform", 
            "white-space", 
            "widows", 
            "word-spacing"];
        
        function usingGetComputedStyle(el, applyToElement) {
            var objectStyles = getComputedStyle(el);

            var style = applyToElement + " {";

            for(var x = 0; x < propertiesToInherit.length; x++) {
               var value = objectStyles.getPropertyValue(propertiesToInherit[x]); 
               if(value) style += propertiesToInherit[x] + ":" + value + ";";
            }

            style += "}";
            
            return style;
        }
        
        function usingCurrentStyle(el, applyToElement) {
            var objectStyles = el.currentStyle;

            var style = applyToElement + " {";

            for(var x = 0; x < propertiesToInherit.length; x++) {
               var value = objectStyles[propertiesToInherit[x]]; 
               if(value) style += propertiesToInherit[x] + ":" + value + ";";
            }

            style += "}";
            return style;
        }
        
        if(window.getComputedStyle) {
            return usingGetComputedStyle(self.me, baseElement);
        } else if(self.me.currentStyle){
            return usingCurrentStyle(self.me, baseElement);
        }
        
        
        return "";
    }
    
    function onDocumentReady() {
        if(self.Config.Visible === false) {
            self.me.css.display = "none";
        } else setStyleSheets();
        setBaseTarget();
        setDefaultParamaters(self.me);
    }
    
    function generateDocumentation() {
        var methods = [];
	var events = [];
	var getProperties = [];
	var setProperties = [];
	
	for(var x in window) {
            if(x.indexOf("public_") === 0) {  
                var matchedStr = window[x].toString().match(/public_(.*)\)/g);
                if(matchedStr) {
                    methods.push(matchedStr[0].replace("public_", ""));
                } else {
                    methods.push(x.replace("public_", ""));  
                }
            }
            if(x.indexOf("get_") === 0) getProperties.push(x.replace("get_", ""));
            if(x.indexOf("set_") === 0) setProperties.push(x.replace("set_", ""));
            if(x.indexOf("event_") === 0) events.push(x.replace("event_", ""));
        }
	
	function printArray(caption, array) {
            if(array.length === 0) return;

            var h4 = document.createElement("h4");
            h4.innerHTML = caption;		
            document.body.appendChild(h4);

            var ul = document.createElement("ul");

            for(var x = 0; x < array.length; x++) {
                var li = document.createElement("li");
                li.innerHTML = array[x];
                ul.appendChild(li);
            }

            document.body.appendChild(ul);
	}
	
	document.body.innerHTML = ""; 
	
	var h2 = document.createElement("h2");
	h2.innerHTML = "This is a HTMLComponent and works inside a html container.";
	document.body.appendChild(h2);
	
	printArray("Public methods and objects:", methods);
	printArray("Get properties:", getProperties);
	printArray("Set properties:", setProperties);
	printArray("Events:", events);	
    }
    
    function onDOMContentLoaded() {
        if(!self.me) setupObject.call(self);
        if(window.top === window.self) {
            if(self.Config.ShowDocumentation === true) {
                generateDocumentation();
            } else {
                self.me = window;
            }
        } else {
            onDocumentReady();
        }
    }    
    
    function onLoad() {
        setupObject.call(self);
        if(window.top === window.self) {
            if(self.Config.ShowDocumentation === true) {
                generateDocumentation();
            } else {
                self.me = window;
            }
        } else {
            onDocumentReady();
        }        
    }

    if(window.addEventListener) window.addEventListener("DOMContentLoaded", onDOMContentLoaded, false);
    else if(window.attachEvent) window.attachEvent("onload", onLoad);
    
    setupObject.call(this);
    
    return this;
 };