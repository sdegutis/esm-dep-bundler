// meh why not
Array.prototype.unique = function() {
    const seen = {};
    return this.filter(item => {
        const found = seen[item];
        if (!found) seen[item] = true;
        return !found;
    });
};
