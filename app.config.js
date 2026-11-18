// Usa el número de ejecución de GitHub Actions como versionCode, para que
// cada APK nuevo se instale encima del anterior.
module.exports = ({ config }) => {
  const run = Number(process.env.GITHUB_RUN_NUMBER || 0);
  return {
    ...config,
    version: `1.0.${run}`,
    android: { ...config.android, versionCode: run > 0 ? run : config.android.versionCode },
  };
};
