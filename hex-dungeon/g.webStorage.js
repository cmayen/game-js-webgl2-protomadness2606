
g.webStorage = {
    save(key, value){
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch(e){
            console.warn("Failed to save to localStorage:", e);
        }
    },
    load(key){
        try {
            const item = localStorage.getItem(key);
            if(item){
                return JSON.parse(item);
            }
        } catch(e){
            console.warn("Failed to load from localStorage:", e);
        }
        return null;
    },
    remove(key){
        try {
            localStorage.removeItem(key);
        } catch(e){
            console.warn("Failed to remove from localStorage:", e);
        }
        return null;
    },
};
