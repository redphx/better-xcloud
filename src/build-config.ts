const BuildConfig = {
    TARGET: Bun.env.BUILD_TARGET,
};

export const getBuildConfig = () => {
    console.log(BuildConfig);
    return BuildConfig;
};
