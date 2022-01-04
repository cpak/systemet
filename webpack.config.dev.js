const prodConfig = require("./webpack.config");

module.exports = {
  ...prodConfig,
  mode: "development",
  devtool: "inline-source-map",
  optimization: {
    usedExports: true,
  },
};
