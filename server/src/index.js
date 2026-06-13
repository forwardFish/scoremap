const { createApp } = require('./app');

if (require.main === module) {
  const { app, env } = createApp();
  app.listen(env.port, '0.0.0.0', () => {
    console.log(`scoremap api listening on ${env.publicBaseUrl}`);
  });
}

module.exports = {
  createApp
};
