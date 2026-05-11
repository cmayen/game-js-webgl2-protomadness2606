
const g = {
    css: [],
    loadHandlers: [],
    load(){
        for(const handler of g.loadHandlers){ handler(); }
        if(g.css.length > 0){
            const style = document.createElement("style");
            style.textContent = g.css.join("\n");
            document.head.appendChild(style);
        }
    },
};
window.onload = g.load;

