import stylus from 'stylus';

export const isFullVersion = () => {
    return Bun.env.BUILD_VARIANT === 'full';
};

export const isLiteVersion = () => {
    return Bun.env.BUILD_VARIANT === 'lite';
};

export const renderStylus = async () => {
    const file = Bun.file('./src/assets/css/styles.styl');
    const cssStr = await file.text();

    const generatedCss = await (stylus(cssStr, {})
        .set('filename', 'styles.css')
        .set('compress', true)
        .include('src/assets/css/'))
        .render();

    return generatedCss;
};


export const compressCss = (css: string) => {
    return (stylus(css, {}).set('compress', true)).render();
};
