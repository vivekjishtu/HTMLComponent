(function(){
    //TODO: Try easyxdm.net for cross domain messages
    
    if(window.addEventListener) {
        window.addEventListener("DOMContentLoaded", main, false);
        window.addEventListener("message", messageParser, false);    
    }
    
    var HTMLComponentList = {};
    var origin = "*";
    
    var Event = new function() {
        this.raise = function(object, eventName, data) {
                var event = {data: data};
                if(document.createEvent) {
                    event = document.createEvent("Event");
                    event.data = data;
                    event.initEvent(eventName, true, false);
                } 

                if(object[eventName]) {
                   if(object[eventName]) object[eventName].apply(object, [event]);
                } 

                if(object.dispatchEvent) return object.dispatchEvent(event);
                return event;
        };
        return this;
    };
    
    function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x7|0x8)).toString(16);
        });
        return uuid;
    }
    
    function getParametersFromAttributes(object) {
        var attr = object.attributes;
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
    
    function setupMethodCall(componentID, methodName) {
        var object = HTMLComponentList[componentID].object;
        
        function methodCall() {
            object.contentWindow.postMessage(JSON.stringify({
                message: "METHOD",
                methodName: methodName,
                arguments: Array.prototype.slice.call(arguments, 0)
            }), origin);
        }
        
        object[methodName] = methodCall;
    }
    
    function setupObjectInterface(componentID, interface) {
        var object = HTMLComponentList[componentID].object;
        
        HTMLComponentList[componentID].handshake = true;
        HTMLComponentList[componentID].interface = interface;
        object.setAttribute("data-component-id", componentID);
        
        // Setup methods
        for(var x = 0 ; x < interface.methods.length; x++) {
            setupMethodCall(componentID, interface.methods[x]);
        }
        
        Event.raise(object, "HTMLComponentLoaded", null);
    }
    
    function messageParser(event) {
        var data = JSON.parse(event.data);
        switch(data.message) {
            case "COMPONENTINIT": 
                if(data.componentID) {
                    setupObjectInterface(data.componentID, data.interface);
                }
                break;
            case "EVENT":
                 break;
            default: 

        }
    }
    
    function object_onLoad(event) {
        var uuid = generateUUID();
        
        if(location.origin) origin = location.origin;
        
        HTMLComponentList[uuid] = {object: this, handshake: false};
        
        this.contentWindow.postMessage(
            JSON.stringify({
                message: "INITCOMPONENT", 
                componentID: uuid
            }), origin);
    }
    
    function main() {
        var objects = document.getElementsByTagName("iframe");
        
        for(var x  = 0; x < objects.length; x++) {
            objects[x].addEventListener("load", object_onLoad, false);
        }
        
    }
    
})();