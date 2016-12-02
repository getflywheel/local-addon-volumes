# Synopsis [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/getflywheel/local-addon-volumes/pulls/)

![Local Addon: Volumes Screenshot](/screenshot.png?raw=true)

## Installation

### Downloading a Release

1. Download the [latest release](https://github.com/getflywheel/local-addon-volumes/releases)
2. Go to Settings » Add-ons inside Local (1.1.0 or newer) and click on Install Add-on
3. Browse to the downloaded release
4. Check the checkbox by the Volumes addon to enable it
5. Restart Local

### Cloning

Place the repository into the following directory depending on your platform:

- macOS: `~/Library/Application Support/Local by Flywheel/addons`

## Developing

### Installing Dev Dependencies
`npm install`

### Folder Structure
All files in `/src` will be transpiled to `/lib` using [Babel](https://github.com/babel/babel/). Anything in `/lib` will be overwritten.

### Transpiling
`npm run-script build`

### Babel, transpiling, ES6, Node.js, what?
Not familiar with some or any of these terms? Here are a few resources to get you up to speed.

- Node.js
  - [The Art of Node](https://github.com/maxogden/art-of-node#the-art-of-node)
- Babel
  - [Babel Introduction](https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/user-handbook.md#toc-introduction)
  - [Source-to-source compiler (Wikipedia)](https://en.wikipedia.org/wiki/Source-to-source_compiler)
- ES6/ES2015
  - [Learn ES2015](https://babeljs.io/docs/learn-es2015/)
  - [JavaScript — Just another introduction to ES6](https://medium.com/sons-of-javascript/javascript-an-introduction-to-es6-1819d0d89a0f#.a11ayxe2p)

## Dev Dependencies

- [babel-cli](https://github.com/babel/babel/tree/master/packages): Babel command line.
- [babel-preset-es2015](https://github.com/babel/babel/tree/master/packages): Babel preset for all es2015 plugins.
- [babel-preset-react](https://github.com/babel/babel/tree/master/packages): Babel preset for all React plugins.
- [babel-preset-stage-0](https://github.com/babel/babel/tree/master/packages): Babel preset for stage 0 plugins


## License

MIT
