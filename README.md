# Synopsis [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/pressmatic/pressmatic-addon-stats/pulls/)

Addon for [Pressmatic](https://pressmatic.io) that shows graphs and resource stats for individual local sites.

![Pressmatic Addon: Stats Screenshot](/screenshot.png?raw=true)

## Installation

Clone or download a release of this addon and place the folder into the following directory depending on your platform:

- macOS: `~/Library/Application Support/Pressmatic/addons`

If you chose to clone instead of downloading a release you will need to use npm to install any production dependencies. This can be done by opening the directory in your shell of choice and typing `npm i --production`.

## Developing

### Pressmatic Addon API

This addon interfaces with Pressmatic using the [Pressmatic Addon API](https://pressmatic.gitbooks.io/addon-api/content/).

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

## Dependencies

- [lodash](https://github.com/lodash/lodash): Lodash modular utilities.
- [smoothie](https://github.com/joewalnes/smoothie): Smoothie Charts: smooooooth JavaScript charts for realtime streaming data

## Dev Dependencies

- [babel](https://github.com/babel/babel/tree/master/packages): Turn ES6 code into readable vanilla ES5 with source maps
- [babel-cli](https://github.com/babel/babel/tree/master/packages): Babel command line.
- [babel-preset-es2015](https://github.com/babel/babel/tree/master/packages): Babel preset for all es2015 plugins.
- [babel-preset-react](https://github.com/babel/babel/tree/master/packages): Babel preset for all React plugins.
- [babel-preset-stage-0](https://github.com/babel/babel/tree/master/packages): Babel preset for stage 0 plugins


## License

MIT
