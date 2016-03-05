(function(){

if(window.addEventListener) window.addEventListener("message", messageParser, false);

var componentID = null;
var origin = "*";

var objectInstance = {
    methods: {},
    getters: {},
    setters: {},
    events: {}
};

if(location.origin) origin = location.origin;

function getObjectInterface() {
    var interface = {
        methods: [],
        getters: [],
        setters: [],
        events: []
    };
    var item;
    
    for(var x in window) {
        if(x.indexOf("public_") === 0) {
            item = x.replace("public_", "");
            interface.methods.push(item);
            objectInstance.methods[item] = window[x];
            continue;
        }

        if(x.indexOf("event_") === 0) {
            item = x.replace("event_", "");
            interface.events.push(item);
            objectInstance.events[item] = window[x];
            continue;
        }

        if(x.indexOf("get_") === 0) {
            item = x.replace("get_", "");
            interface.getters.push(item);
            objectInstance.getters[item] = window[x];
            continue;
        }

        if(x.indexOf("set_") === 0) {
            item = x.replace("get_", "");
            interface.getters.push(item);
            objectInstance.setters[item] = window[x];
            continue;
        }
        
    }
    return interface;
}

function messageParser(event) {
    var data = JSON.parse(event.data);
    
    switch(data.message) {
        case "INITCOMPONENT": 
             componentID = data.componentID;
             parent.postMessage(
                JSON.stringify({
                    message: "COMPONENTINIT",
                    componentID: componentID,
                    interface: getObjectInterface()
                }), origin);
             break;
        
        case "SETPARAMS": 
            //params
            break;
        
        case "METHOD":
            objectInstance.methods[data.methodName].apply(this, data.arguments);
         //   alert("Method call " + data.arguments);
            break;
        case "GETPROPERTY":
            break;
        case "SETPROPERTY":
            break;
         default: 
            
    }
    
}


})();