window.BX_EXPOSED.streamSession = this;

const orgSetMicrophoneState = this.setMicrophoneState.bind(this);
this.setMicrophoneState = state => {
    orgSetMicrophoneState(state);

    const evt = new Event(BxEvent.MICROPHONE_STATE_CHANGED);
    evt.microphoneState = state;

    window.dispatchEvent(evt);
};

window.dispatchEvent(new Event(BxEvent.STREAM_SESSION_READY));

// Patch updateDimensions() to make native touch work correctly with WebGL2
let updateDimensionsStr = this.updateDimensions.toString();

if (updateDimensionsStr.startsWith('function ')) {
    updateDimensionsStr = updateDimensionsStr.substring(9);
}

// if(r){
const renderTargetVar = updateDimensionsStr.match(/if\((\w+)\){/)[1];

updateDimensionsStr = updateDimensionsStr.replaceAll(renderTargetVar + '.scroll', 'scroll');

updateDimensionsStr = updateDimensionsStr.replace(`if(${renderTargetVar}){`, `
if (${renderTargetVar}) {
    const scrollWidth = ${renderTargetVar}.dataset.width ? parseInt(${renderTargetVar}.dataset.width) : ${renderTargetVar}.scrollWidth;
    const scrollHeight = ${renderTargetVar}.dataset.height ? parseInt(${renderTargetVar}.dataset.height) : ${renderTargetVar}.scrollHeight;
`);

eval(`this.updateDimensions = function ${updateDimensionsStr}`);
