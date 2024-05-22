const msg = JSON.parse(e);
if (msg.reason === 'WarningForBeingIdle' && !window.location.pathname.includes('/launch/')) {
    try {
        this.sendKeepAlive();
        return;
    } catch (ex) { console.log(ex); }
}
