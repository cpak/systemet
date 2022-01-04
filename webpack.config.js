const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    content: path.join(__dirname, "src", "content.ts"),
    background: path.join(__dirname, "src", "background.ts"),
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "build"),
  },
  target: "web",
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: "/node_modules/",
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader"
        ]
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "assets/manifest.json", to: "manifest.json" },
        { from: "assets/*.css", to: "[name][ext]" },
        { from: "assets/icon-*.png", to: "[name][ext]" },
      ],
    }),
  ],
};
